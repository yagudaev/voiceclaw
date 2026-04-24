import { PrismaClient } from "@prisma/client"

// Prisma client singleton. Next.js hot-reload in dev re-runs module
// top-level code, which would leak Prisma connections without this
// pattern. In production the `global` cache is unused.

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["warn", "error"] })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL)
}
