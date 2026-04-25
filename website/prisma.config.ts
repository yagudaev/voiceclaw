import "dotenv/config"
import { defineConfig } from "prisma/config"

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://voiceclaw:voiceclaw@localhost:5432/voiceclaw"

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: databaseUrl },
})
