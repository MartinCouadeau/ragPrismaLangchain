import { OpenAIEmbeddings } from "@langchain/openai";
import { PrismaClient } from '../../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg'
import { Request, Response } from "express";
import dotenv from 'dotenv'

  dotenv.config()

const connectionString = `${process.env.DATABASE_URL}`

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

export async function vectorSearch(req: Request, res: Response) {
  try {
    // 1. Initialize OpenAI embeddings (same as before)
    const embeddings = new OpenAIEmbeddings({
      stripNewLines: true,
    });
    // 2. Get the question
    const { question } = req.body;
    
    // 3. Create embedding for the question
    const questionEmbedding = await embeddings.embedQuery(question);

    // pgvector expects: [1.0, 2.0, 3.0]
    const vectorString = `[${questionEmbedding.join(',')}]`;
    
    
    const results = await prisma.$queryRaw`
      SELECT 
        id, 
        content, 
        metadata, 
        embedding <=> ${vectorString}::vector as similarity
      FROM "Document"
      WHERE embedding IS NOT NULL
      ORDER BY similarity ASC
      LIMIT 20;
    `;
    
    return res.status(200).json(results);
    
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Search failed" });
  }
}