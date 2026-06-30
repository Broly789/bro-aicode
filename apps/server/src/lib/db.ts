import { PrismaClient } from '@brocode/database'
import { PrismaPostgresAdapter } from '@prisma/adapter-ppg'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPostgresAdapter({
      connectionString: process.env.DATABASE_URL!,
    }),
  })

globalForPrisma.prisma = prisma
