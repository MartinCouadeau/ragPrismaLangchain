// test-db.ts
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv'

  dotenv.config()

const connectionString = process.env.DATABASE_URL;
console.log('DATABASE_URL:', connectionString?.replace(/:[^:]*@/, ':****@')); // Hide password

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Simple query to test connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful:', result);
    
    // Test if Document table exists
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('✅ Available tables:', tables);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();