// Single source of truth for session-level cost aggregation. Used by CostTab
// (per-category breakdown) and the session sidebar (total-cost stat). Keeping
// the logic here avoids the two surfaces disagreeing — the sidebar previously
// just summed `o.cost_usd`, which the collector rarely populates for realtime
// voice spans, so the sidebar read "—" while CostTab showed a real number.

import type { ObservationRow } from "./db"
import { computeCost, type PricingCatalog } from "./pricing"

export type CostCategory = "Realtime" | "Brain"

export function categorizeObservation(o: ObservationRow): CostCategory | null {
  const name = o.name ?? ""
  if (name === "openclaw.llm") return "Brain"
  if (name === "voice-turn") return "Realtime"
  if (name.startsWith("gemini.") || name.startsWith("openai.") || name.startsWith("realtime.")) {
    return "Realtime"
  }
  const model = (o.model ?? "").toLowerCase()
  if (model.includes("realtime") || model.includes("live-preview")) return "Realtime"
  return null
}

export type CostForObservation = {
  category: CostCategory
  cost_usd: number
  tokens: number
}

// Returns the same per-observation number CostTab uses: prefer the reported
// `cost_usd` when the collector filled it in, otherwise estimate from token
// counts via the shared pricing catalog. Uncategorizable spans return null.
export function costForObservation(
  o: ObservationRow,
  catalog: PricingCatalog,
): CostForObservation | null {
  const category = categorizeObservation(o)
  if (!category) return null
  const tokensIn = o.tokens_input ?? 0
  const tokensOut = o.tokens_output ?? 0
  const cached = o.tokens_cached ?? 0
  const reported = o.cost_usd ?? 0
  if (tokensIn + tokensOut === 0 && reported === 0) {
    return { category, cost_usd: 0, tokens: 0 }
  }
  const cost_usd =
    reported > 0
      ? reported
      : computeCost(catalog, o.model, { input: tokensIn, output: tokensOut, cached }).total_usd
  return { category, cost_usd, tokens: tokensIn + tokensOut }
}

export function computeSessionTotalCost(
  observations: ObservationRow[],
  catalog: PricingCatalog,
): number {
  let total = 0
  for (const o of observations) {
    const row = costForObservation(o, catalog)
    if (row) total += row.cost_usd
  }
  return total
}
