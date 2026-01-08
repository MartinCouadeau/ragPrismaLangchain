import express from "express";
import cors from "cors";
import routes from "./routes/index.routes"
import { prisma } from "./lib/prisma";
import process from "process";

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit immediately, log and continue
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle SIGTERM for graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  process.exit(0);
});

const app = express()
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}))
app.use(express.json())
app.use("/api", routes)

const server = app.listen(3000, () => {
  console.log('Server listening on http://localhost:3000')
})

process.on('SIGINT', async () => {
  console.log('\nShutting down...')
  server.close()
  await prisma.$disconnect()
  process.exit(0)
})
