import { PrismaClient } from '../../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Request, Response } from "express";
import dotenv from 'dotenv';
import { OpenAI } from "openai";
import { serializeForJSON } from '@/utils/serializeJson';
import { validateSQL } from '@/utils/validateSQL';
import { generateSQLFromQuestion } from '@/utils/sqlFromQuestion';
import { executeFallbackSearch } from '@/utils/schemaFallbackSearch';

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
    //console.log("[semanticGlobalSearch] Incoming question:", question);
    
    // Step 1: Generate SQL from natural language using AI
    const value = await generateSQLFromQuestion(openai, question);

    let sql, parameters, explanation, entityTypes;

    if (value.sql == 'HISTORIC') {
      return res.status(200).json(value)
    } else {
      ({ sql, parameters, explanation, entityTypes } = value);
    }
    
    /*
    console.log("--------------------------------");
    console.log("[semanticGlobalSearch] AI returned SQL:", sql);
    console.log("--------------------------------");
    console.log("[semanticGlobalSearch] Parameters:", parameters);
    console.log("--------------------------------");
    console.log("[semanticGlobalSearch] Explanation:", explanation);
    console.log("--------------------------------");
    console.log("[semanticGlobalSearch] EntityTypes:", entityTypes);
    console.log("--------------------------------");*/

    // Step 2: Execute the generated SQL
    let results;
    try {
      const validatedSQL = validateSQL(sql);
      
      if (parameters && parameters.length > 0) {
        results = await prisma.$queryRawUnsafe(validatedSQL, ...parameters);
      } else {
        results = await prisma.$queryRawUnsafe(validatedSQL);
      }

      results = serializeForJSON(results);

    } catch (dbError: any) {
      console.error("Database error:", dbError.message);
      
      try {
        const fallback = await executeFallbackSearch(prisma, question);
        return res.status(200).json({
          question,
          sql: fallback.sql || "Fallback search",
          explanation: fallback.explanation || "Schema-aware keyword search",
          entityTypes: fallback.entityTypes.length ? fallback.entityTypes : ["general"],
          results: fallback.results,
          totalResults: Array.isArray(fallback.results) ? fallback.results.length : 1,
          note: `Original question failed: ${dbError.message?.substring(0, 100)}`
        });
      } catch (fallbackError) {
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
    
    try {
      const fallback = await executeFallbackSearch(prisma, req.body.question || "");
      return res.status(200).json({
        question: req.body.question,
        sql: fallback.sql || "Fallback search",
        explanation: fallback.explanation || "Schema-aware keyword search",
        entityTypes: fallback.entityTypes.length ? fallback.entityTypes : ["general"],
        results: fallback.results,
        totalResults: Array.isArray(fallback.results) ? fallback.results.length : 1,
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
