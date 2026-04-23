// Server-only pricing helpers. Fetches the models.dev catalog once per app
// lifetime, caches to `~/.voiceclaw/pricing_cache.json` so we don't re-fetch on
// every dev reload, and exposes a few small cost-computation helpers used by
// the cost breakdown tab.
//
// The tracing-collector already writes a `cost_usd` column onto each
// observation for models it recognises. This module is a best-effort
// complement: for spans that don't carry a resolved cost (e.g. Gemini Live
// audio tokens) we look up the model in the cached catalog and estimate.

import { promises as fs } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"

const CACHE_PATH = join(homedir(), ".voiceclaw", "pricing_cache.json")
const CATALOG_URL = "https://models.dev/api/models"
// Don't refetch more than once every 24h — the catalog is slow-moving and the
// collector side also refreshes, so being aggressive here is pointless.
const REFRESH_MS = 24 * 60 * 60 * 1000

// models.dev returns a provider→models map. The per-model shape we care about
// is the `cost` record: { input, output, cache_read?, cache_write? } in $/MTok.
export type ModelEntry = {
  id: string
  name?: string
  cost?: {
    input?: number
    output?: number
    cache_read?: number
    cache_write?: number
  }
  modalities?: {
    input?: string[]
    output?: string[]
  }
}

export type PricingCatalog = Record<string, ModelEntry>

// Fallback table for models/modalities models.dev either doesn't cover or
// undercounts. Keep minimal and override-friendly (extend as new costs come
// up). Values are $/MTok.
//
// Realtime/live voice models are priced at their AUDIO rate — the dominant
// modality for this app. Text-only reasoning models (Claude) use their
// standard text rates.
const FALLBACK_PRICING: PricingCatalog = {
  // Google Gemini — realtime / live only
  "gemini-3.1-flash-live-preview": { id: "gemini-3.1-flash-live-preview", cost: { input: 3, output: 12 } },

  // OpenAI Realtime
  "gpt-realtime": { id: "gpt-realtime", cost: { input: 32, output: 64, cache_read: 0.4 } },
  "gpt-realtime-mini": { id: "gpt-realtime-mini", cost: { input: 10, output: 20, cache_read: 0.3 } },

  // Anthropic Claude (text)
  "claude-opus-4-7": { id: "claude-opus-4-7", cost: { input: 5, output: 25, cache_read: 0.5, cache_write: 6.25 } },
  "claude-sonnet-4-6": { id: "claude-sonnet-4-6", cost: { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75 } },
  "claude-haiku-4-5": { id: "claude-haiku-4-5", cost: { input: 1, output: 5, cache_read: 0.1, cache_write: 1.25 } },
}

let cached: { at: number; catalog: PricingCatalog } | null = null
let inflight: Promise<PricingCatalog> | null = null

export async function loadPricingCatalog(): Promise<PricingCatalog> {
  if (cached && Date.now() - cached.at < REFRESH_MS) return cached.catalog
  if (inflight) return inflight
  inflight = doLoad().finally(() => {
    inflight = null
  })
  return inflight
}

export type CostDetail = {
  input_usd: number
  output_usd: number
  cache_read_usd: number
  total_usd: number
  model_matched: boolean
}

// Compute USD cost from token counts + a model id. Falls back to 0 if the
// model isn't in the catalog and we don't have a fallback. `cached_input` is
// counted at the cache_read rate (if provided) rather than the full input
// rate — matches Anthropic/OpenAI billing.
export function computeCost(
  catalog: PricingCatalog,
  modelId: string | null | undefined,
  tokens: { input: number; output: number; cached?: number },
): CostDetail {
  const zero: CostDetail = {
    input_usd: 0,
    output_usd: 0,
    cache_read_usd: 0,
    total_usd: 0,
    model_matched: false,
  }
  if (!modelId) return zero
  const entry = catalog[modelId] ?? FALLBACK_PRICING[modelId]
  if (!entry?.cost) return zero
  const { input = 0, output = 0, cache_read } = entry.cost
  const cached = tokens.cached ?? 0
  const fresh = Math.max(0, tokens.input - cached)
  const input_usd = (fresh / 1_000_000) * input
  const cache_read_usd = cache_read != null ? (cached / 1_000_000) * cache_read : 0
  const output_usd = (tokens.output / 1_000_000) * output
  const total_usd = input_usd + output_usd + cache_read_usd
  return { input_usd, output_usd, cache_read_usd, total_usd, model_matched: true }
}

async function doLoad(): Promise<PricingCatalog> {
  // Try the on-disk cache first so cold starts don't stall on the network.
  const disk = await readDiskCache()
  if (disk && Date.now() - disk.at < REFRESH_MS) {
    cached = disk
    return disk.catalog
  }
  // Fetch fresh — but on failure fall back to whatever we had on disk, or the
  // fallback table. We don't want a network blip to break the UI.
  try {
    const catalog = await fetchCatalog()
    const record = { at: Date.now(), catalog }
    cached = record
    await writeDiskCache(record).catch(() => {})
    return catalog
  } catch {
    if (disk) {
      cached = disk
      return disk.catalog
    }
    cached = { at: Date.now(), catalog: FALLBACK_PRICING }
    return FALLBACK_PRICING
  }
}

async function fetchCatalog(): Promise<PricingCatalog> {
  const res = await fetch(CATALOG_URL, { headers: { accept: "application/json" } })
  if (!res.ok) throw new Error(`models.dev ${res.status}`)
  const raw = (await res.json()) as unknown
  return flattenCatalog(raw)
}

// models.dev returns { providerId: { models: { modelId: ModelEntry } } }.
// Flatten to a flat id→entry map so lookups match the `gen_ai.request.model`
// value written into our spans (which is just the short model id).
function flattenCatalog(raw: unknown): PricingCatalog {
  const out: PricingCatalog = {}
  if (!raw || typeof raw !== "object") return out
  const providers = raw as Record<string, unknown>
  for (const providerValue of Object.values(providers)) {
    if (!providerValue || typeof providerValue !== "object") continue
    const models = (providerValue as { models?: unknown }).models
    if (!models || typeof models !== "object") continue
    for (const [id, entry] of Object.entries(models as Record<string, unknown>)) {
      if (entry && typeof entry === "object") {
        out[id] = { id, ...(entry as Omit<ModelEntry, "id">) }
      }
    }
  }
  // Layer fallbacks on top so our hand-tuned entries win over empty/partial
  // catalog rows.
  return { ...out, ...FALLBACK_PRICING }
}

async function readDiskCache(): Promise<{ at: number; catalog: PricingCatalog } | null> {
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf8")
    const parsed = JSON.parse(raw) as { at?: number; catalog?: PricingCatalog }
    if (!parsed?.catalog || typeof parsed.at !== "number") return null
    return { at: parsed.at, catalog: parsed.catalog }
  } catch {
    return null
  }
}

async function writeDiskCache(record: { at: number; catalog: PricingCatalog }): Promise<void> {
  await fs.mkdir(dirname(CACHE_PATH), { recursive: true })
  await fs.writeFile(CACHE_PATH, JSON.stringify(record), "utf8")
}
