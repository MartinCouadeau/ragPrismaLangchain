import { OpenAI } from "openai";
import { buildSQLPrompt, responseContent } from "./promp";
import { getFullDatabaseSchema } from "./dataBaseSchema";
import { validateSQL } from "./validateSQL";
import { generateSchemaFallbackSQL, GeneratedSQL } from "./schemaFallbackSearch";

export async function generateSQLFromQuestion(openai: OpenAI, userQuestion: string): Promise<GeneratedSQL> {
  const databaseSchema = getFullDatabaseSchema();
  const prompt = buildSQLPrompt(databaseSchema, userQuestion);

  try {
    //console.log("[generateSQLFromQuestion] Prompting model with userQuestion:", userQuestion);
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: responseContent() },
        { role: "user", content: prompt }
      ],
      temperature: 0.45,
      max_tokens: 1500
    });

    const usage = response.usage;
    if (usage) {
      console.log("[generateSQLFromQuestion] token usage:")
      console.log("Tokens used by prompt:", usage.prompt_tokens);
      console.log("Tokens used by completion:", usage.completion_tokens);
      console.log("Total tokens used:", usage.total_tokens);
    }

    //console.log("[generateSQLFromQuestion] Raw AI message:", response.choices?.[0]?.message.content);

    const content = response.choices[0].message.content;

    if (content == 'HISTORIC') {
      return {
      sql: 'HISTORIC',
      explanation: "historic data request",
      parameters: [],
      entityTypes: ["general"]
    };
    }
    if (!content) throw new Error("No response from AI");

    const cleanedContent = cleanAIResponse(content);
    let result;

    try {
      result = JSON.parse(cleanedContent);
    } catch {
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error(`Could not parse JSON from AI response: ${cleanedContent.substring(0, 200)}`);
      }
      result = JSON.parse(jsonMatch[0]);
    }

    if (!result.sql || typeof result.sql !== "string") {
      throw new Error(`Invalid SQL in response: ${JSON.stringify(result)}`);
    }

    const validatedSQL = validateSQL(result.sql);

    console.log("--------------------------------");
    console.log("[generateSQLFromQuestion] Validated SQL:", validatedSQL);
    console.log("--------------------------------");
    
    return {
      sql: validatedSQL,
      explanation: result.explanation || `Search for: ${userQuestion}`,
      parameters: result.parameters || [],
      entityTypes: result.entityTypes || ["general"]
    };
  } catch (aiError: any) {
    console.error("AI generation error:", aiError.message);
    return generateSchemaFallbackSQL(userQuestion);
  }
}

function cleanAIResponse(content: string): string {
  let cleaned = content.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/```json\n?/, "").replace(/\n?```/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/```\n?/, "").replace(/\n?```/, "");
  }
  return cleaned.trim();
}
