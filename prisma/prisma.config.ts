// prisma/prisma.config.ts
// This file is used by Prisma Migrate to find your database URL.

export default {
  db: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: '/prisma/seed.ts',
  },
};
