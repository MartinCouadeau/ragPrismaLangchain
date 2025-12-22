import { PrismaClient } from '../../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Request, Response } from "express";
import dotenv from 'dotenv';
import { OpenAI } from "openai";
import { serializeForJSON } from '@/utils/serializeJson';
import { validateSQL } from '@/utils/validateSQL';
import { getFullDatabaseSchema } from '@/utils/dataBaseSchema';

dotenv.config();

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function semanticGlobalSearch(req: Request, res: Response) {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: "question is required" });
    }
    
    // Step 1: Generate SQL from natural language using AI
    const { sql, parameters, explanation, entityTypes } = await generateSQLFromQuestion(question);
    
    console.log("Generated SQL:", sql);
    console.log("Parameters:", parameters);
    
    // Step 2: Execute the generated SQL
    let results;
    try {
      // Validate and fix SQL before execution
      const validatedSQL = validateSQL(sql);
      
      if (parameters && parameters.length > 0) {
        results = await prisma.$queryRawUnsafe(validatedSQL, ...parameters);
      } else {
        results = await prisma.$queryRawUnsafe(validatedSQL);
      }

      results = serializeForJSON(results);

    } catch (dbError: any) {
      console.error("Database error:", dbError.message);
      
      // Try a simpler fallback question
      try {
        const fallbackResults = await executeFallbackSearch(question);
        return res.status(200).json({
          question,
          sql: "Fallback search",
          explanation: "Used simplified keyword search",
          entityTypes: ["general"],
          results: fallbackResults,
          totalResults: Array.isArray(fallbackResults) ? fallbackResults.length : 1,
          note: `Original question failed: ${dbError.message?.substring(0, 100)}`
        });
      } catch (fallbackError) {
        // Ultimate fallback - very simple user search
        const simpleResults = await prisma.$queryRaw<any[]>`
          SELECT id, "firstName", "lastName", email 
          FROM "User" 
          WHERE "firstName" ILIKE ${`%${question.substring(0, 20)}%`} 
          LIMIT 10
        `;
        
        return res.status(200).json({
          question,
          sql: "Simple user search",
          explanation: "Basic user name search",
          entityTypes: ["user"],
          results: simpleResults,
          totalResults: Array.isArray(simpleResults) ? simpleResults.length : 1,
          note: "All searches failed, showing basic user results"
        });
      }
    }
    
    // Step 3: Format and return results
    return res.status(200).json({
      question,
      sql,
      explanation,
      entityTypes,
      results,
      totalResults: Array.isArray(results) ? results.length : 1
    });
    
  } catch (error: any) {
    console.error("AI search error:", error.message);
    
    // Final fallback to basic search
    try {
      const fallbackResults = await executeFallbackSearch(req.body.question || "");
      return res.status(200).json({
        question: req.body.question,
        sql: "Fallback search",
        explanation: "Basic keyword search",
        entityTypes: ["general"],
        results: fallbackResults,
        totalResults: Array.isArray(fallbackResults) ? fallbackResults.length : 1,
        note: "AI search failed, showing basic results"
      });
    } catch (fallbackError) {
      return res.status(500).json({ 
        error: "Search failed",
        details: error.message || 'Unknown error'
      });
    }
  }
}

// Generate SQL from natural language question using AI
async function generateSQLFromQuestion(userQuestion: string): Promise<{
  sql: string;
  explanation: string;
  parameters?: any[];
  entityTypes: string[];
}> {
  const databaseSchema = getFullDatabaseSchema();
  
  const prompt = `
You are a SQL expert that converts natural language questions to PostgreSQL queries.

DATABASE SCHEMA:
${JSON.stringify(databaseSchema, null, 2)}

USER QUESTION: "${userQuestion}"

CRITICAL FORMATTING RULES:
1. ALL column names that contain capital letters MUST be wrapped in double quotes. 
   Example: "firstName", "lastName", "createdAt", "projectId"
   INCORRECT: firstname, lastname, createdat, projectid
2. Table names should be wrapped in double quotes: "User", "Project", "Task"
3. Keep queries SIMPLE - avoid complex GROUP BY unless absolutely necessary
4. When using aggregates (COUNT, SUM), make sure all non-aggregated columns are in GROUP BY

INSTRUCTIONS:
1. Generate ONLY a PostgreSQL SELECT question
2. Use parameterized queries with $1, $2, etc. for any user input values
3. Always include LIMIT 100 for safety unless the user specifies otherwise
4. For "how many" questions, use COUNT(*)
5. For aggregation questions, use appropriate functions (SUM, AVG, MAX, MIN)
6. Use ILIKE for text searches with % wildcards
7. Include appropriate JOINs based on relationships
8. Handle date comparisons properly
9. Return a valid JSON object with this exact structure: {sql: string, explanation: string, parameters: array, entityTypes: array}

EXAMPLES:
1. For "how many users are on the platform?" return: 
   {"sql": "SELECT COUNT(*) as count FROM \\"User\\"", "explanation": "Counts all users", "parameters": [], "entityTypes": ["user"]}
2. For "show me active projects" return: 
   {"sql": "SELECT * FROM \\"Project\\" WHERE status = 'IN_PROGRESS' LIMIT 100", "explanation": "Shows all active projects", "parameters": [], "entityTypes": ["project"]}
3. For "find tasks assigned to John" return: 
   {"sql": "SELECT t.*, u.\\"firstName\\", u.\\"lastName\\" FROM \\"Task\\" t JOIN \\"User\\" u ON t.\\"assigneeId\\" = u.id WHERE u.\\"firstName\\" ILIKE $1 LIMIT 100", "explanation": "Finds tasks assigned to users named John", "parameters": ["%John%"], "entityTypes": ["task", "user"]}
4. For "users with email containing gmail" return:
   {"sql": "SELECT * FROM \\"User\\" WHERE email ILIKE $1 LIMIT 100", "explanation": "Finds users with gmail addresses", "parameters": ["%gmail%"], "entityTypes": ["user"]}

Now generate the SQL question for: "${userQuestion}"
Return ONLY the JSON object, no other text.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a SQL expert. Convert natural language to safe PostgreSQL SELECT queries.
IMPORTANT: Always wrap column names with capital letters in double quotes. 
Examples: "firstName", NOT firstname. "createdAt", NOT createdat. "projectId", NOT projectid.
Keep queries simple. Avoid complex GROUP BY clauses.
Return ONLY valid JSON: {sql: string, explanation: string, parameters: array, entityTypes: array}`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 1500
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error("No response from AI");
    }
    
    // Extract and clean JSON
    const cleanedContent = cleanAIResponse(content);
    let result;
    
    try {
      result = JSON.parse(cleanedContent);
    } catch (parseError) {
      // If JSON parsing fails, try to extract it
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error(`Could not parse JSON from AI response: ${cleanedContent.substring(0, 200)}`);
      }
      result = JSON.parse(jsonMatch[0]);
    }
    
    // Validate required fields
    if (!result.sql || typeof result.sql !== 'string') {
      throw new Error(`Invalid SQL in response: ${JSON.stringify(result)}`);
    }
    
    // Apply validateSQL to the generated SQL
    const validatedSQL = validateSQL(result.sql);
    
    return {
      sql: validatedSQL,
      explanation: result.explanation || `Search for: ${userQuestion}`,
      parameters: result.parameters || [],
      entityTypes: result.entityTypes || ["general"]
    };
    
  } catch (aiError: any) {
    console.error("AI generation error:", aiError.message);
    // Fallback to simple SQL generation
    return await generateSimpleSQL(userQuestion);
  }
}

// Helper function to clean AI response
function cleanAIResponse(content: string): string {
  let cleaned = content.trim();
  
  // Remove markdown code blocks
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/```json\n?/, '').replace(/\n?```/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/```\n?/, '').replace(/\n?```/, '');
  }
  
  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

// Simple fallback SQL generation
async function generateSimpleSQL(userQuestion: string): Promise<{
  sql: string;
  explanation: string;
  parameters?: any[];
  entityTypes: string[];
}> {
  const lowerQuestion = userQuestion.toLowerCase();
  
  // Check for count queries
  if (lowerQuestion.includes('how many') || lowerQuestion.includes('count')) {
    if (lowerQuestion.includes('user')) {
      return {
        sql: 'SELECT COUNT(*) as count FROM "User"',
        explanation: "Count of all users",
        parameters: [],
        entityTypes: ["user"]
      };
    } else if (lowerQuestion.includes('project')) {
      return {
        sql: 'SELECT COUNT(*) as count FROM "Project"',
        explanation: "Count of all projects",
        parameters: [],
        entityTypes: ["project"]
      };
    } else if (lowerQuestion.includes('task')) {
      return {
        sql: 'SELECT COUNT(*) as count FROM "Task"',
        explanation: "Count of all tasks",
        parameters: [],
        entityTypes: ["task"]
      };
    }
  }
  
  // Check for specific searches
  if (lowerQuestion.includes('user') || lowerQuestion.includes('person') || lowerQuestion.includes('people')) {
    const searchTerm = extractSearchTerm(userQuestion);
    return {
      sql: `SELECT id, "firstName", "lastName", email, role, status FROM "User" WHERE "firstName" ILIKE $1 OR "lastName" ILIKE $1 OR email ILIKE $1 LIMIT 50`,
      explanation: `Searching for users matching '${searchTerm}'`,
      parameters: [`%${searchTerm}%`],
      entityTypes: ["user"]
    };
  }
  
  if (lowerQuestion.includes('project')) {
    const searchTerm = extractSearchTerm(userQuestion);
    return {
      sql: `SELECT id, name, description, status, "startDate", "endDate" FROM "Project" WHERE name ILIKE $1 OR description ILIKE $1 LIMIT 50`,
      explanation: `Searching for projects matching '${searchTerm}'`,
      parameters: [`%${searchTerm}%`],
      entityTypes: ["project"]
    };
  }
  
  if (lowerQuestion.includes('task')) {
    const searchTerm = extractSearchTerm(userQuestion);
    return {
      sql: `SELECT id, title, description, priority, "dueDate" FROM "Task" WHERE title ILIKE $1 OR description ILIKE $1 LIMIT 50`,
      explanation: `Searching for tasks matching '${searchTerm}'`,
      parameters: [`%${searchTerm}%`],
      entityTypes: ["task"]
    };
  }
  
  // Default: search users
  const searchTerm = extractSearchTerm(userQuestion);
  return {
    sql: `SELECT id, "firstName", "lastName", email FROM "User" WHERE "firstName" ILIKE $1 OR "lastName" ILIKE $1 OR email ILIKE $1 LIMIT 50`,
    explanation: `Searching for '${searchTerm}' in users`,
    parameters: [`%${searchTerm}%`],
    entityTypes: ["user"]
  };
}

// Helper to extract search term from question
function extractSearchTerm(question: string): string {
  const words = question.split(' ');
  // Find the first substantive word (not common stop words)
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 
                     'for', 'of', 'with', 'by', 'show', 'find', 'get', 'list', 'search'];
  
  for (const word of words) {
    const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
    if (cleanWord.length > 2 && !stopWords.includes(cleanWord)) {
      return cleanWord;
    }
  }
  
  // If no substantive word found, use the first word
  return words[0]?.substring(0, 20) || 'search';
}


// Fallback search for when AI fails
async function executeFallbackSearch(question: string): Promise<any[]> {
  const searchPattern = `%${question}%`;
  
  try {
    // Simple cross-table search as fallback
    const results = await prisma.$queryRaw<any[]>`
      SELECT * FROM (
        -- Users
        SELECT 
          id,
          'user' as entity_type,
          CONCAT("firstName", ' ', "lastName") as title,
          email as description,
          'User' as category,
          "createdAt"
        FROM "User"
        WHERE 
          "firstName" ILIKE ${searchPattern}
          OR "lastName" ILIKE ${searchPattern}
          OR email ILIKE ${searchPattern}
        
        UNION ALL
        
        -- Projects
        SELECT 
          id,
          'project' as entity_type,
          name as title,
          description,
          'Project' as category,
          "createdAt"
        FROM "Project"
        WHERE 
          name ILIKE ${searchPattern}
          OR description ILIKE ${searchPattern}
        
        UNION ALL
        
        -- Tasks
        SELECT 
          t.id,
          'task' as entity_type,
          t.title,
          t.description,
          'Task' as category,
          t."createdAt"
        FROM "Task" t
        WHERE 
          t.title ILIKE ${searchPattern}
          OR t.description ILIKE ${searchPattern}
        
        UNION ALL
        
        -- Expenses
        SELECT 
          e.id,
          'expense' as entity_type,
          COALESCE(e.title, 'Expense') as title,
          e.description,
          'Expense' as category,
          e."createdAt"
        FROM "Expense" e
        WHERE 
          e.title ILIKE ${searchPattern}
          OR e.description ILIKE ${searchPattern}
      ) AS search_results
      ORDER BY "createdAt" DESC
      LIMIT 50
    `;
    
    return serializeForJSON(results);
  } catch (error) {
    console.error("Fallback search error:", error);
    return [];
  }
}