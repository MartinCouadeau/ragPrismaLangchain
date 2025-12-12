import { prisma } from "../src/prisma"
import { OpenAIEmbeddings } from '@langchain/openai'
import dotenv from 'dotenv'

  dotenv.config()

async function main() {



  console.log('=== Document Embedding Script ===\n')
  
  // Check for OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required in .env file')
  }

  // Initialize embeddings
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  })

  // Your documents to embed
  const documents = [
    'Our company offers 24/7 customer support via phone and email.',
    'The basic subscription plan costs $29 per month.',
    'All plans include a 30-day money-back guarantee.',
    'We integrate with Slack, Microsoft Teams, and Google Workspace.',
    'API access is available for enterprise customers.',
    'Our platform uses artificial intelligence for data analysis.',
    'Customer satisfaction is our top priority.',
    'We provide detailed analytics and reporting tools.',
    'Monthly webinars are available for all customers.',
    'Our support team responds within 2 hours during business days.'
  ]

  console.log(`Processing ${documents.length} documents...\n`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < documents.length; i++) {
    const text = documents[i]
    
    try {
      console.log(`[${i + 1}/${documents.length}] Embedding: "${text.substring(0, 50)}..."`)
      
      // Generate embedding
      const embedding = await embeddings.embedQuery(text)
      console.log(`   ✓ Embedding generated (${embedding.length} dimensions)`)
      
      // Insert into database
      await prisma.$executeRaw`
        INSERT INTO "Document" (id, content, embedding, metadata, "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid(),
          ${text}, 
          ${JSON.stringify(embedding)}::vector, 
          ${JSON.stringify({ 
            source: 'manual_upload', 
            index: i,
            timestamp: new Date().toISOString()
          })}, 
          NOW(), 
          NOW()
        )
      `
      
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
  const totalCount = await prisma.document.count()
  console.log(`\nTotal documents in database: ${totalCount}`)
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