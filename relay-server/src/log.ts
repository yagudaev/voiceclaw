// Centralized logger — every line gets a local timestamp

function ts() {
  return new Date().toLocaleString("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false, fractionalSecondDigits: 3,
  }).replace(",", "")
}

export function log(...args: unknown[]) {
  console.log(`[${ts()}]`, ...args)
}

export function warn(...args: unknown[]) {
  console.warn(`[${ts()}]`, ...args)
}

export function error(...args: unknown[]) {
  console.error(`[${ts()}]`, ...args)
}
