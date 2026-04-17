"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const OPTIONS = [
  {
    href: "/brand",
    letter: "◦",
    name: "Brief",
    thesis: "Design brief & process",
  },
  {
    href: "/brand/a/v2",
    letter: "A",
    name: "Sonar Dark",
    thesis: "Energy wins — the brand is the signal",
    versions: [
      { href: "/brand/a/v1", label: "v1 · original" },
      { href: "/brand/a/v2", label: "v2 · iterated" },
    ],
    match: "/brand/a",
  },
  {
    href: "/brand/b/v3",
    letter: "B",
    name: "Editorial Quiet",
    thesis: "Restraint wins — confidence in silence",
    versions: [
      { href: "/brand/b/v1", label: "v1 · original" },
      { href: "/brand/b/v2", label: "v2 · iterated" },
      { href: "/brand/b/v3", label: "v3 · grid fix" },
    ],
    match: "/brand/b",
  },
  {
    href: "/brand/c/v2",
    letter: "C",
    name: "Instrument Panel",
    thesis: "Utility wins — the brand is the mixing desk",
    versions: [
      { href: "/brand/c/v1", label: "v1 · original" },
      { href: "/brand/c/v2", label: "v2 · iterated" },
    ],
    match: "/brand/c",
  },
  {
    href: "/brand/d",
    letter: "D",
    name: "The Ghost",
    thesis: "Invisibility wins — thin layer, literally",
  },
]

export function BrandSidebar() {
  const pathname = usePathname()
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col overflow-y-auto border-r border-white/10 bg-black/40 p-6 backdrop-blur-xl md:flex">
      <Link
        href="/brand"
        className="mb-8 flex items-center gap-2 text-sm font-mono uppercase tracking-widest text-white/60 transition-colors hover:text-white"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
        VoiceClaw / Brand
      </Link>

      <nav className="flex flex-col gap-1">
        {OPTIONS.map((opt) => {
          const matchBase = opt.match ?? opt.href
          const active =
            pathname === opt.href ||
            (opt.href !== "/brand" && pathname?.startsWith(matchBase))
          return (
            <div key={opt.href}>
              <Link
                href={opt.href}
                className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:bg-white/5 hover:text-white/90"
                }`}
              >
                <span
                  className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border font-mono text-xs ${
                    active
                      ? "border-white/40 bg-white/10 text-white"
                      : "border-white/15 text-white/40 group-hover:border-white/30"
                  }`}
                >
                  {opt.letter}
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-sm font-medium">{opt.name}</span>
                  <span className="mt-0.5 text-[10.5px] text-white/35 group-hover:text-white/55">
                    {opt.thesis}
                  </span>
                </span>
              </Link>

              {opt.versions && active && (
                <div className="ml-9 mt-1 mb-2 flex flex-col gap-0.5 border-l border-white/10 pl-3">
                  {opt.versions.map((v) => {
                    const vActive = pathname === v.href
                    return (
                      <Link
                        key={v.href}
                        href={v.href}
                        className={`rounded px-2 py-1 font-mono text-[10.5px] tracking-wide transition-colors ${
                          vActive
                            ? "bg-white/10 text-white"
                            : "text-white/40 hover:bg-white/5 hover:text-white/70"
                        }`}
                      >
                        {v.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="mt-auto border-t border-white/10 pt-6 font-mono text-[10px] leading-relaxed text-white/30">
        <p>BRAND MANDATE</p>
        <p className="mt-1 text-white/50">
          A precise voice interface for your agent — not a mascot, not a
          destination product.
        </p>
      </div>
    </aside>
  )
}
