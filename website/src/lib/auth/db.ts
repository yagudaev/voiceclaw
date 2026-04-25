import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

// Prisma client singleton. Next.js hot-reload in dev re-runs module
// top-level code, which would leak Prisma connections without this
// pattern. In production the `global` cache is unused.

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

const databaseUrl = resolveDatabaseUrl()

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
    log: ["warn", "error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (url) return url
  // No throw here: Next.js evaluates this at build time with NODE_ENV=production
  // but no DATABASE_URL set, and a throw would break `next build`. Callers should
  // gate runtime DB access on `isDatabaseConfigured()` to fail loudly when needed.
  if (process.env.NODE_ENV === "production") {
    console.warn("[prisma] DATABASE_URL not set; falling back to localhost")
  }
  return "postgresql://voiceclaw:voiceclaw@localhost:5432/voiceclaw"
}
