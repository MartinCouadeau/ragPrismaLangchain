import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { promises as fsp } from "fs";
import { prisma } from '../lib/prisma'
import { OpenAIEmbeddings } from '@langchain/openai'
import dotenv from 'dotenv'

  let output = []
  dotenv.config()


export default async function main() {


  console.log('=== Document Embedding Script ===\n')
  
  // Check for OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required in .env file')
  }

  // Initialize embeddings
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  })

  const docsDir = "files";
  const fileNames = await fsp.readdir(docsDir);
  for (const fileName of fileNames) {
    const document = await fsp.readFile(`${docsDir}/${fileName}`, "utf8");
    
    const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
        chunkSize: 500,
        chunkOverlap: 50,
    });
    output = await splitter.createDocuments([document]);
    //console.log("___________________________________________________")
    //console.log("document: ",output)
  }


  // Your documents to embed
  const documents = output

  console.log(`Processing ${documents.length} documents...\n`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i]
    const text = doc.pageContent
    
    try {
      console.log(`[${i + 1}/${documents.length}] Embedding: "${text.substring(0, 50)}..."`)
      
      // Generate embedding
      const embedding = await embeddings.embedQuery(text)
      console.log(`   ✓ Embedding generated (${embedding.length} dimensions)`)
      
      // Insert into database
      
      
      console.log(`   ✓ Stored in database\n`)
      successCount++
      
    } catch (error) {
      console.log(`   ✗ Error: ${error.message}\n`)
      errorCount++
    }
  }

  console.log('=== Summary ===')
  console.log(`Successfully embedded: ${successCount} documents`)
  console.log(`Failed: ${errorCount} documents`)
  
  // Show total count
}


main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('Script failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })