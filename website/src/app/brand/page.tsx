const THESES = [
  {
    letter: "A",
    name: "Sonar Dark",
    thesis: "Energy wins — the brand is the signal.",
    designer: "Claude",
    palette: "Midnight + electric cyan, waveform-first",
  },
  {
    letter: "B",
    name: "Editorial Quiet",
    thesis: "Restraint wins — confidence in silence.",
    designer: "Codex",
    palette: "Warm paper + serif + one surgical accent",
  },
  {
    letter: "C",
    name: "Instrument Panel",
    thesis: "Utility wins — the brand is the mixing desk.",
    designer: "Gemini",
    palette: "Control-surface neutrals + meter greens",
  },
  {
    letter: "D",
    name: "The Ghost",
    thesis: "Invisibility wins — thin layer, literally.",
    designer: "Three-way collab",
    palette: "System-native, glass, zero branded fluff",
  },
]

export default function BrandIndex() {
  return (
    <div className="bg-neutral-950 text-white">
      <section className="border-b border-white/10 px-8 py-24 md:px-16">
        <div className="mx-auto max-w-4xl">
          <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.3em] text-emerald-400/80">
            Design brief / four theses
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            VoiceClaw brand exploration.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/60 sm:text-xl">
            Four genuinely distinct identities answering one question: how does
            a thin voice layer over someone else&apos;s agent carry a brand
            without overshadowing the product?
          </p>

          <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.03] p-6 font-mono text-[13px] leading-relaxed text-white/70">
            <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-white/40">
              Brand mandate
            </p>
            <p className="text-white/90">
              VoiceClaw is a precise voice interface for your agent — not a
              mascot, not a destination product, not another glowing-cyan AI
              toy.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-4">
              <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400/80">
                Attributes
              </p>
              <p className="text-sm text-white/80">
                Precise · fast · technical · composed · instrument-like ·
                quietly confident
              </p>
            </div>
            <div className="rounded-lg border border-rose-400/20 bg-rose-400/5 p-4">
              <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-rose-400/80">
                Anti-attributes
              </p>
              <p className="text-sm text-white/80">
                Not cute · not anthropomorphic · not cyberpunk cosplay · not
                assistant-as-friend · not beige SaaS
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-8 py-16 md:px-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-10 text-2xl font-semibold tracking-tight sm:text-3xl">
            The four theses
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {THESES.map((t) => (
              <a
                key={t.letter}
                href={`/brand/${t.letter.toLowerCase()}`}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-white/25 hover:bg-white/[0.06]"
              >
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-black/40 font-mono text-sm text-white/60 transition-colors group-hover:border-white/40 group-hover:text-white">
                    {t.letter}
                  </span>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{t.name}</h3>
                    <p className="mt-1 text-sm text-white/70">{t.thesis}</p>
                    <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.2em] text-white/40">
                      {t.palette} · design by {t.designer}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-8 py-16 md:px-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-xl font-semibold tracking-tight">Process</h2>
          <ol className="space-y-4 text-sm leading-relaxed text-white/70">
            <li>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
                01 /
              </span>{" "}
              Each thesis is designed by one agent (Claude, Codex, Gemini).
            </li>
            <li>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
                02 /
              </span>{" "}
              The other two agents screenshot the rendered page and critique —
              visual loop, not code-only.
            </li>
            <li>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
                03 /
              </span>{" "}
              Each designer iterates once against the sharpest critiques.
            </li>
            <li>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
                04 /
              </span>{" "}
              For option D, all three agents collaborate from scratch using
              what was learned in A/B/C.
            </li>
          </ol>
        </div>
      </section>
    </div>
  )
}
