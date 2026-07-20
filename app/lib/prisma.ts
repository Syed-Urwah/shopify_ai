import { PrismaClient } from '@/lib/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Add prisma to the NodeJS global type
// This prevents multiple instances of PrismaClient in development
declare global {
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

// Instantiate the Pool for the pg driver
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Instantiate the PrismaPg adapter
const adapter = new PrismaPg(pool);

if (process.env.NODE_ENV === 'production') {
  // In production, create a new PrismaClient instance
  prisma = new PrismaClient({ adapter });
} else {
  // In development, use a global instance to prevent hot-reloading issues
  if (!global.prisma) {
    global.prisma = new PrismaClient({ adapter }); // Corrected instantiation
  }
  prisma = global.prisma;
}

export default prisma;
