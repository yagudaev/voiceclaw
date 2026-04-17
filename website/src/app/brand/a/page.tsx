import type { ReactNode, SVGProps } from "react"

export default function OptionA() {
  return (
    <div className="bg-[#0A0E14] text-white">
      <div className="font-sans">
        <Hero />
        <MarkSection />
        <ColorSection />
        <TypographySection />
        <IconographySection />
        <AppIconsSection />
        <AppStoreSection />
        <LandingSection />
        <DocsSection />
        <FooterNote />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.07] px-8 py-24 md:px-16 md:py-36">
      <BackgroundWaveform />
      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#5BE1E6]" />
          Option A · Sonar Dark · Claude
          <span className="text-white/20">/</span>
          Energy wins
        </div>

        <div className="mt-10 flex items-center gap-8">
          <MarkIcon className="h-20 w-20 shrink-0" />
          <span className="font-[family-name:var(--font-geist-sans)] text-[5rem] font-semibold leading-[0.9] tracking-[-0.035em] text-white md:text-[7.5rem]">
            VoiceClaw
          </span>
        </div>

        <p className="mt-10 max-w-2xl font-[family-name:var(--font-geist-sans)] text-xl leading-snug text-white/70 md:text-2xl">
          A thin voice layer for your agent. Talk to any AI in real time, from
          anywhere. The signal is the brand.
        </p>

        <div className="mt-10 grid max-w-4xl gap-3 sm:grid-cols-3">
          <ThesisCard label="Mandate">
            Precise voice interface for your agent. Not a mascot.
          </ThesisCard>
          <ThesisCard label="Answers the paradox with">
            Energy. Let the waveform do the talking.
          </ThesisCard>
          <ThesisCard label="Red line">
            Never glowing-cyan-AI wallpaper. Every element must carry data.
          </ThesisCard>
        </div>
      </div>
    </section>
  )
}

function BackgroundWaveform() {
  const bars = Array.from({ length: 120 }, (_, i) => i)
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center gap-[2px] opacity-[0.12]"
    >
      {bars.map((i) => {
        const seed = (Math.sin(i * 0.55) + Math.sin(i * 0.17) * 0.4) * 0.5 + 0.5
        const h = 6 + seed * 100
        return (
          <div
            key={i}
            className="w-[6px] shrink-0 rounded-full bg-gradient-to-t from-[#5BE1E6] to-[#9AF1FF]"
            style={{ height: `${h}%` }}
          />
        )
      })}
    </div>
  )
}

function ThesisCard({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur">
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-[#5BE1E6]/70">
        {label}
      </p>
      <p className="text-sm leading-snug text-white/85">{children}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Mark                                                                */
/* ------------------------------------------------------------------ */

function MarkSection() {
  return (
    <Section
      eyebrow="01 / Mark"
      title="An abstract grip, measuring a signal."
      description="Two vertical brackets — the grip — enclose a waveform they don't produce. VoiceClaw never generates the signal; it only carries it. The mark encodes that humility: it's a pair of calipers on your agent's voice."
    >
      <div className="grid gap-8 md:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-start gap-6 rounded-xl border border-white/10 bg-[#0F1520] p-8">
          <MarkIcon className="h-32 w-32" />
          <MarkIcon className="h-16 w-16" />
          <MarkIcon className="h-8 w-8" />
          <MarkIcon className="h-4 w-4" />
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
            128 / 64 / 32 / 16 px
          </p>
        </div>

        <ConstructionGrid />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <MarkNote title="Grip, not talon">
          Two mirrored brackets, 120° apart. Implies precision enclosure, not
          predation.
        </MarkNote>
        <MarkNote title="Signal, not noise">
          The three inner strokes follow a 3–5–2 rhythm. Always an odd count.
          Never symmetric.
        </MarkNote>
        <MarkNote title="Wordmark anchor">
          The V in VoiceClaw shares the bracket&apos;s 14° angle. The mark and
          wordmark are the same system.
        </MarkNote>
      </div>
    </Section>
  )
}

function MarkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      aria-label="VoiceClaw mark"
    >
      <defs>
        <linearGradient id="vc-signal" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#9AF1FF" />
          <stop offset="100%" stopColor="#5BE1E6" />
        </linearGradient>
      </defs>
      {/* left bracket */}
      <path
        d="M14 16 L6 32 L14 48"
        stroke="url(#vc-signal)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* right bracket */}
      <path
        d="M50 16 L58 32 L50 48"
        stroke="url(#vc-signal)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* waveform (3-5-2 rhythm of bar heights) */}
      <rect x="21" y="28" width="3" height="8" rx="1.5" fill="#E8FBFF" />
      <rect x="27" y="22" width="3" height="20" rx="1.5" fill="#E8FBFF" />
      <rect x="33" y="26" width="3" height="12" rx="1.5" fill="#E8FBFF" />
      <rect x="39" y="30" width="3" height="4" rx="1.5" fill="#E8FBFF" />
      <rect x="45" y="27" width="3" height="10" rx="1.5" fill="#E8FBFF" opacity="0.6" />
    </svg>
  )
}

function ConstructionGrid() {
  return (
    <div className="relative flex items-center justify-center rounded-xl border border-white/10 bg-[#0F1520] p-8">
      <div className="relative h-[360px] w-[360px]">
        {/* grid */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 360 360"
          fill="none"
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <line
              key={`v${i}`}
              x1={i * 45}
              x2={i * 45}
              y1="0"
              y2="360"
              stroke="#1E2A3A"
              strokeWidth="1"
            />
          ))}
          {Array.from({ length: 9 }).map((_, i) => (
            <line
              key={`h${i}`}
              x1="0"
              x2="360"
              y1={i * 45}
              y2={i * 45}
              stroke="#1E2A3A"
              strokeWidth="1"
            />
          ))}
          {/* 14deg angle guides */}
          <line
            x1="90"
            y1="45"
            x2="45"
            y2="180"
            stroke="#5BE1E6"
            strokeDasharray="2 4"
            strokeWidth="1"
            opacity="0.4"
          />
          <line
            x1="270"
            y1="45"
            x2="315"
            y2="180"
            stroke="#5BE1E6"
            strokeDasharray="2 4"
            strokeWidth="1"
            opacity="0.4"
          />
        </svg>
        <MarkIcon className="absolute inset-0 h-full w-full" />
        <span className="absolute -bottom-6 right-0 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          8-unit grid · 14° bracket · 3-5-2 signal
        </span>
      </div>
    </div>
  )
}

function MarkNote({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#5BE1E6]/80">
        {title}
      </p>
      <p className="mt-2 text-sm leading-snug text-white/70">{children}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Color                                                               */
/* ------------------------------------------------------------------ */

const PALETTE = [
  {
    group: "Ground",
    swatches: [
      { name: "Ink", hex: "#0A0E14", oklch: "0.12 0.02 245", usage: "App background" },
      { name: "Shaft", hex: "#0F1520", oklch: "0.17 0.025 245", usage: "Cards, surfaces" },
      { name: "Edge", hex: "#1E2A3A", oklch: "0.28 0.02 245", usage: "Borders, dividers" },
      { name: "Mute", hex: "#4B5968", oklch: "0.48 0.02 245", usage: "Secondary text" },
    ],
  },
  {
    group: "Signal",
    swatches: [
      { name: "Sonar", hex: "#5BE1E6", oklch: "0.82 0.14 200", usage: "Primary, live audio" },
      { name: "Sonar-hi", hex: "#9AF1FF", oklch: "0.9 0.1 205", usage: "Highlights, wave peaks" },
      { name: "Ember", hex: "#FFB15B", oklch: "0.81 0.14 70", usage: "Recording, warning" },
      { name: "Pulse", hex: "#7BE597", oklch: "0.84 0.15 155", usage: "Ready, success" },
    ],
  },
  {
    group: "Print",
    swatches: [
      { name: "Paper", hex: "#F7FAFC", oklch: "0.98 0.005 220", usage: "Body text (dark UI)" },
      { name: "Foil", hex: "#C9D4E0", oklch: "0.84 0.02 240", usage: "Headlines on dark" },
    ],
  },
]

function ColorSection() {
  return (
    <Section
      eyebrow="02 / Color"
      title="A three-band palette. Ground, signal, print."
      description="Ground is always dark — this is a voice tool that lives next to an IDE and beside a menubar. Signal is reserved for the one thing happening right now (live audio, recording, ready). Print is neutral type. If a color is on screen, it is doing a job."
    >
      <div className="space-y-10">
        {PALETTE.map((band) => (
          <div key={band.group}>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
              {band.group}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {band.swatches.map((s) => (
                <div
                  key={s.name}
                  className="overflow-hidden rounded-lg border border-white/10"
                >
                  <div className="h-24 w-full" style={{ background: s.hex }} />
                  <div className="bg-[#0F1520] p-3">
                    <p className="font-semibold text-white">{s.name}</p>
                    <p className="mt-1 font-mono text-[11px] text-white/40">
                      {s.hex}
                    </p>
                    <p className="font-mono text-[10px] text-white/30">
                      oklch({s.oklch})
                    </p>
                    <p className="mt-2 text-[11px] text-white/55">{s.usage}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* Typography                                                          */
/* ------------------------------------------------------------------ */

function TypographySection() {
  return (
    <Section
      eyebrow="03 / Type"
      title="Two voices: Geist and JetBrains."
      description="The system uses one sans for everything human (Geist), and one mono for everything machine (JetBrains). No serif, no script, no decorative weight. Hierarchy lives in size contrast and letter-spacing — not typeface variation."
    >
      <div className="space-y-2 rounded-xl border border-white/10 bg-[#0F1520] p-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
          Display · Geist Semibold · -0.035em
        </p>
        <p className="font-[family-name:var(--font-geist-sans)] text-7xl font-semibold leading-[0.9] tracking-[-0.035em]">
          Talk to your agent.
        </p>
        <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
          H1 · Geist Semibold · 48 · -0.02em
        </p>
        <p className="font-[family-name:var(--font-geist-sans)] text-5xl font-semibold leading-tight tracking-tight">
          Connect your brain, not ours.
        </p>
        <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
          Body · Geist Regular · 17 · 1.55
        </p>
        <p className="max-w-2xl text-[17px] leading-[1.55] text-white/75">
          VoiceClaw is an open-source voice layer. It doesn&apos;t ship an
          agent — it connects to yours. Point it at any OpenAI-compatible
          endpoint and start talking.
        </p>
        <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
          Mono · JetBrains Mono · for data, addresses, numerals
        </p>
        <p className="font-[family-name:var(--font-jetbrains)] text-base text-[#5BE1E6]">
          rtt  42ms   ·   jitter  1.8ms   ·   buf  96kb   ·   hop  iad → sfo
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <TypeRule>Only two typefaces. If you need a third, you&apos;re wrong.</TypeRule>
        <TypeRule>Numerals are tabular and monospace — always.</TypeRule>
        <TypeRule>Eyebrow labels: 10px, 0.25em tracking, UPPERCASE. Signals a system voice.</TypeRule>
      </div>
    </Section>
  )
}

function TypeRule({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm text-white/70">
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Iconography                                                         */
/* ------------------------------------------------------------------ */

const ICON_STROKE = 1.6
function IconographySection() {
  return (
    <Section
      eyebrow="04 / Icons"
      title="One stroke, one rhythm."
      description="All icons are drawn on a 24px grid with a 1.6px stroke, rounded caps, sharp joins. Signal-carrying icons (Listen, Speak, Route) get a filled cyan dot. Everything else stays line-only. Function, not decoration."
    >
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-4 lg:grid-cols-6">
        <IconCell label="Listen" active>
          <IconListen />
        </IconCell>
        <IconCell label="Speak" active>
          <IconSpeak />
        </IconCell>
        <IconCell label="Route" active>
          <IconRoute />
        </IconCell>
        <IconCell label="Brain">
          <IconBrain />
        </IconCell>
        <IconCell label="Signal">
          <IconSignal />
        </IconCell>
        <IconCell label="Session">
          <IconSession />
        </IconCell>
        <IconCell label="Key">
          <IconKey />
        </IconCell>
        <IconCell label="Tool">
          <IconTool />
        </IconCell>
        <IconCell label="Gain">
          <IconGain />
        </IconCell>
        <IconCell label="Mesh">
          <IconMesh />
        </IconCell>
        <IconCell label="Latency">
          <IconLatency />
        </IconCell>
        <IconCell label="Bolt">
          <IconBolt />
        </IconCell>
      </div>
    </Section>
  )
}

function IconCell({
  label,
  active,
  children,
}: {
  label: string
  active?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex aspect-square flex-col items-center justify-center gap-3 bg-[#0F1520] p-4">
      <div
        className={`flex h-10 w-10 items-center justify-center ${
          active ? "text-[#5BE1E6]" : "text-white/80"
        }`}
      >
        {children}
      </div>
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
        {label}
      </span>
    </div>
  )
}

function Svg({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}

function IconListen() {
  return (
    <Svg>
      <path d="M12 4a4 4 0 0 0-4 4v4a4 4 0 0 0 8 0V8a4 4 0 0 0-4-4Z" />
      <path d="M5 12a7 7 0 0 0 14 0" />
      <path d="M12 19v2" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </Svg>
  )
}
function IconSpeak() {
  return (
    <Svg>
      <path d="M4 7v10l5 -3h9a2 2 0 0 0 2 -2V7a2 2 0 0 0 -2 -2H6a2 2 0 0 0 -2 2Z" />
      <circle cx="10" cy="11" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="13" cy="11" r="0.9" fill="currentColor" stroke="none" />
    </Svg>
  )
}
function IconRoute() {
  return (
    <Svg>
      <circle cx="5" cy="6" r="1.6" />
      <circle cx="5" cy="18" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
      <path d="M6 7.2 17.4 11.2" />
      <path d="M6 16.8 17.4 12.8" />
      <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
    </Svg>
  )
}
function IconBrain() {
  return (
    <Svg>
      <path d="M9 5a3 3 0 0 0 -3 3 3 3 0 0 0 -2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3V5Z" />
      <path d="M15 5a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1 -2 5 3 3 0 0 1 -3 3V5Z" />
    </Svg>
  )
}
function IconSignal() {
  return (
    <Svg>
      <path d="M4 18 L4 14" />
      <path d="M9 18 L9 10" />
      <path d="M14 18 L14 6" />
      <path d="M19 18 L19 12" />
    </Svg>
  )
}
function IconSession() {
  return (
    <Svg>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 9 L20 9" />
      <path d="M8 14 L16 14" />
    </Svg>
  )
}
function IconKey() {
  return (
    <Svg>
      <circle cx="8" cy="12" r="3" />
      <path d="M11 12 L20 12" />
      <path d="M17 12 L17 15" />
      <path d="M14 12 L14 15" />
    </Svg>
  )
}
function IconTool() {
  return (
    <Svg>
      <path d="M14 4 a4 4 0 0 1 4 4 4 4 0 0 1 -4 4 L11 12 L11 20 L8 20 L8 12 a4 4 0 0 1 0 -8 Z" />
    </Svg>
  )
}
function IconGain() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 5 L12 8" />
      <path d="M12 19 L12 16" />
      <path d="M12 12 L16 9" />
    </Svg>
  )
}
function IconMesh() {
  return (
    <Svg>
      <circle cx="6" cy="6" r="1.6" />
      <circle cx="18" cy="6" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="6" cy="18" r="1.6" />
      <circle cx="18" cy="18" r="1.6" />
      <path d="M7 7 L11 11" />
      <path d="M17 7 L13 11" />
      <path d="M7 17 L11 13" />
      <path d="M17 17 L13 13" />
    </Svg>
  )
}
function IconLatency() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8 L12 12 L15 14" />
    </Svg>
  )
}
function IconBolt() {
  return (
    <Svg>
      <path d="M13 3 L5 13 L11 13 L11 21 L19 11 L13 11 Z" />
    </Svg>
  )
}

/* ------------------------------------------------------------------ */
/* App icons                                                           */
/* ------------------------------------------------------------------ */

function AppIconsSection() {
  return (
    <Section
      eyebrow="05 / App icons"
      title="Two devices, one mark."
      description="iOS gets an aggressive vignette — the icon has to pop against a photographic wallpaper. macOS keeps the bracket mark edge-to-edge, using the dock's soft drop shadow for separation. The waveform subtly animates in the app; here it's frozen at peak."
    >
      <div className="grid gap-10 lg:grid-cols-2">
        <IosTileContext />
        <MacDockContext />
      </div>
    </Section>
  )
}

function AppIconArt({ size = 192 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 192 192"
      className="block"
      aria-hidden
    >
      <defs>
        <linearGradient id="bg-a" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#0A0E14" />
          <stop offset="100%" stopColor="#122033" />
        </linearGradient>
        <radialGradient id="glow-a" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0%" stopColor="#5BE1E6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#5BE1E6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mark-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#9AF1FF" />
          <stop offset="100%" stopColor="#5BE1E6" />
        </linearGradient>
      </defs>
      <rect width="192" height="192" fill="url(#bg-a)" />
      <circle cx="96" cy="96" r="80" fill="url(#glow-a)" />
      {/* left bracket */}
      <path
        d="M56 54 L36 96 L56 138"
        stroke="url(#mark-grad)"
        strokeWidth="8.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* right bracket */}
      <path
        d="M136 54 L156 96 L136 138"
        stroke="url(#mark-grad)"
        strokeWidth="8.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* waveform 3-5-2 */}
      <rect x="72" y="84" width="7" height="24" rx="3.5" fill="#E8FBFF" />
      <rect x="85" y="66" width="7" height="60" rx="3.5" fill="#E8FBFF" />
      <rect x="98" y="78" width="7" height="36" rx="3.5" fill="#E8FBFF" />
      <rect x="111" y="88" width="7" height="16" rx="3.5" fill="#E8FBFF" />
      <rect x="124" y="82" width="7" height="28" rx="3.5" fill="#E8FBFF" opacity="0.6" />
    </svg>
  )
}

function IosTileContext() {
  const otherApps = [
    { label: "Notes", color: "#FFD43A", glyph: "N" },
    { label: "Maps", color: "#5CB85C", glyph: "M" },
    { label: "Music", color: "#FF3B30", glyph: "♪" },
    { label: "Mail", color: "#0A84FF", glyph: "@" },
    { label: "Linear", color: "#5E6AD2", glyph: "L" },
    { label: "Tower", color: "#2DD4BF", glyph: "T" },
    { label: "Arc", color: "#F43F5E", glyph: "A" },
  ]
  return (
    <div className="overflow-hidden rounded-[44px] border border-white/10 bg-gradient-to-br from-[#1A2540] via-[#1E1734] to-[#2D1E2F] p-6 shadow-2xl">
      <p className="mb-4 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
        iOS · home screen · 1024 @ squircle
      </p>
      <div className="grid grid-cols-4 gap-5">
        <IosAppTile label="VoiceClaw" featured>
          <AppIconArt size={80} />
        </IosAppTile>
        {otherApps.map((app) => (
          <IosAppTile key={app.label} label={app.label}>
            <div
              className="flex h-20 w-20 items-center justify-center text-2xl font-semibold text-black"
              style={{ background: app.color }}
            >
              {app.glyph}
            </div>
          </IosAppTile>
        ))}
      </div>
      <div className="mt-6 flex justify-center">
        <div className="rounded-2xl bg-white/5 px-8 py-3 backdrop-blur">
          <p className="text-center font-mono text-[10px] text-white/50">
            1024 × 1024 · squircle mask · iOS 17+
          </p>
        </div>
      </div>
    </div>
  )
}

function IosAppTile({
  children,
  label,
  featured,
}: {
  children: ReactNode
  label: string
  featured?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`overflow-hidden ${featured ? "ring-2 ring-[#5BE1E6] ring-offset-2 ring-offset-[#1A2540]" : ""}`}
        style={{
          width: 80,
          height: 80,
          borderRadius: "22.37%", // iOS squircle approx
        }}
      >
        {children}
      </div>
      <p className="text-[11px] text-white/90">{label}</p>
    </div>
  )
}

function MacDockContext() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#141C2A] to-[#0A0E14] p-6 shadow-2xl">
      <p className="mb-4 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
        macOS · dock · 1024 @ rounded-square
      </p>
      <div className="flex flex-col items-center gap-12">
        <div
          className="shadow-[0_40px_80px_-20px_rgba(91,225,230,0.25),0_20px_40px_-10px_rgba(0,0,0,0.6)]"
          style={{
            borderRadius: 50,
            overflow: "hidden",
            width: 220,
            height: 220,
          }}
        >
          <AppIconArt size={220} />
        </div>

        <div className="flex items-end gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur">
          {[
            { glyph: "F", color: "#0A84FF", label: "Finder" },
            { glyph: "✱", color: "#FF375F", label: "LaunchPad" },
            { glyph: "", color: "", mark: true, label: "VoiceClaw" },
            { glyph: "S", color: "#3B82F6", label: "Safari" },
            { glyph: "M", color: "#10B981", label: "Messages" },
            { glyph: "C", color: "#F59E0B", label: "Calendar" },
            { glyph: "T", color: "#8B5CF6", label: "Terminal" },
          ].map((app, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className="overflow-hidden shadow-lg"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: app.color || "transparent",
                }}
              >
                {app.mark ? (
                  <AppIconArt size={48} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-black/80">
                    {app.glyph}
                  </div>
                )}
              </div>
              {app.mark && (
                <div className="h-1 w-1 rounded-full bg-white/70" />
              )}
            </div>
          ))}
        </div>
        <p className="font-mono text-[10px] text-white/40">
          1024 × 1024 · macOS rounded-square · Sonoma shadow
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* App Store                                                           */
/* ------------------------------------------------------------------ */

function AppStoreSection() {
  return (
    <Section
      eyebrow="06 / Store"
      title="How it lists in the App Store."
      description="Two different audiences shop two different stores. iOS listing leads with voice. Mac listing leads with routing and developer control. Same brand, different first sentence."
    >
      <div className="grid gap-8 xl:grid-cols-2">
        <IosStoreCard />
        <MacStoreCard />
      </div>
    </Section>
  )
}

function IosStoreCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white text-neutral-900">
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-3 text-sm">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded text-[#0a84ff]">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2 L14 10 L22 10 L15.5 14 L18 22 L12 17 L6 22 L8.5 14 L2 10 L10 10 Z" />
            </svg>
          </div>
          <span className="font-semibold">App Store</span>
        </div>
        <span className="text-[11px] text-neutral-500">iPhone</span>
      </div>

      <div className="p-6">
        <div className="flex items-start gap-5">
          <div
            className="shrink-0 overflow-hidden shadow-md"
            style={{ width: 120, height: 120, borderRadius: "22.37%" }}
          >
            <AppIconArt size={120} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">VoiceClaw</h3>
            <p className="text-sm text-neutral-600">
              Voice for your AI agent
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button className="rounded-full bg-[#0a84ff] px-5 py-1.5 text-sm font-semibold text-white">
                GET
              </button>
              <span className="text-xs text-neutral-500">In-App Purchases</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 divide-x divide-neutral-200 border-y border-neutral-200 py-4 text-center text-[11px] text-neutral-500">
          <Stat label="Rating" value="4.8" sub="★★★★★ 241" />
          <Stat label="Age" value="12+" sub="Years old" />
          <Stat label="Category" value="#12" sub="Developer Tools" />
          <Stat label="Developer" value="N3L" sub="nano3 labs" />
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
            Preview
          </p>
          <div className="mt-3 flex gap-3 overflow-x-auto">
            {[0, 1, 2].map((i) => (
              <ScreenshotTile key={i} index={i} />
            ))}
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-semibold">Open-source. BYO-brain.</h4>
          <p className="mt-2 text-[13px] leading-relaxed text-neutral-700">
            VoiceClaw is a thin voice layer for the agent you already have.
            Connect any OpenAI-compatible endpoint and talk to it naturally —
            from your phone, from your dock, from the subway.
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-neutral-700">
            Real-time streaming via Gemini Live or OpenAI Realtime. Your keys,
            your agent, your data. MIT licensed.
          </p>
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="px-2">
      <p className="uppercase">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-900">{value}</p>
      <p className="text-[10px] text-neutral-500">{sub}</p>
    </div>
  )
}

function ScreenshotTile({ index }: { index: number }) {
  const content: Record<number, ReactNode> = {
    0: <PhoneListeningScreen />,
    1: <PhoneTranscriptScreen />,
    2: <PhoneSettingsScreen />,
  }
  return (
    <div
      className="shrink-0 overflow-hidden rounded-xl border border-neutral-200"
      style={{ width: 180, aspectRatio: "9 / 19.5" }}
    >
      {content[index]}
    </div>
  )
}

function PhoneListeningScreen() {
  return (
    <div className="flex h-full w-full flex-col bg-[#0A0E14] p-3 text-white">
      <div className="flex items-center justify-between text-[9px] text-white/50">
        <span>9:41</span>
        <span>VoiceClaw</span>
        <span>100%</span>
      </div>
      <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-4">
        <MarkIcon className="h-16 w-16" />
        <p className="text-sm font-semibold">Listening</p>
        <div className="flex items-end gap-[3px]">
          {[6, 14, 22, 10, 18, 24, 14, 8, 20, 12].map((h, i) => (
            <div
              key={i}
              className="w-[4px] rounded-full bg-[#5BE1E6]"
              style={{ height: h * 1.4 }}
            />
          ))}
        </div>
        <p className="font-mono text-[8px] text-white/30">rtt 42ms</p>
      </div>
      <div className="mt-auto flex justify-center">
        <div className="h-12 w-12 rounded-full bg-[#5BE1E6]" />
      </div>
    </div>
  )
}

function PhoneTranscriptScreen() {
  return (
    <div className="flex h-full w-full flex-col bg-[#0A0E14] p-3 text-white">
      <div className="flex items-center justify-between text-[9px] text-white/50">
        <span>9:41</span>
        <span>Transcript</span>
        <span>100%</span>
      </div>
      <div className="mt-3 space-y-2 text-[10px]">
        <div className="rounded-lg bg-white/5 p-2">
          <p className="font-mono text-[8px] text-[#5BE1E6]">YOU</p>
          <p>What did I ship last week?</p>
        </div>
        <div className="rounded-lg border border-white/10 p-2">
          <p className="font-mono text-[8px] text-white/40">AGENT</p>
          <p>Pulling from your commit history...</p>
        </div>
        <div className="rounded-lg border border-white/10 p-2">
          <p className="font-mono text-[8px] text-white/40">AGENT</p>
          <p>Three things: watchdog option, duplicate message fix, and the Gemini recap patch.</p>
        </div>
      </div>
    </div>
  )
}

function PhoneSettingsScreen() {
  return (
    <div className="flex h-full w-full flex-col bg-[#0A0E14] p-3 text-white">
      <div className="flex items-center justify-between text-[9px] text-white/50">
        <span>9:41</span>
        <span>Settings</span>
        <span>100%</span>
      </div>
      <div className="mt-3 space-y-2 text-[9px]">
        <Setting label="Voice model" value="Gemini Live" />
        <Setting label="Brain endpoint" value="brain.local:18789" mono />
        <Setting label="Relay" value="us-west" />
        <Setting label="Watchdog" value="Off" />
        <Setting label="Keys" value="3 configured" />
      </div>
    </div>
  )
}

function Setting({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded-md bg-white/5 px-2 py-1.5">
      <span className="text-white/60">{label}</span>
      <span className={mono ? "font-mono text-[#5BE1E6]" : "text-white"}>
        {value}
      </span>
    </div>
  )
}

function MacStoreCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#1D1D1F] text-white">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#2C2C2E] px-5 py-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
            <div className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
            <div className="h-3 w-3 rounded-full bg-[#28C840]" />
          </div>
          <span className="ml-3 font-semibold text-white/80">Mac App Store</span>
        </div>
        <span className="text-white/40">Developer Tools</span>
      </div>

      <div className="p-8">
        <div className="flex items-start gap-8">
          <div
            className="shrink-0 overflow-hidden shadow-2xl"
            style={{ width: 160, height: 160, borderRadius: 36 }}
          >
            <AppIconArt size={160} />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-white/40">
              Voice interface for your agent
            </p>
            <h3 className="mt-1 text-3xl font-bold">VoiceClaw for Mac</h3>
            <p className="mt-1 text-sm text-white/60">nano3 labs · v1.2 · Open source</p>
            <div className="mt-4 flex items-center gap-3">
              <button className="rounded-full bg-[#0a84ff] px-6 py-1.5 text-sm font-semibold">
                Get
              </button>
              <span className="text-xs text-white/50">4.7 ★ · 184 ratings · 28.6 MB</span>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-4 gap-4 border-y border-white/10 py-4 text-xs">
          <StatDark label="Category" value="Developer" />
          <StatDark label="Chart" value="#5 Dev" />
          <StatDark label="Size" value="28.6 MB" />
          <StatDark label="Age" value="4+" />
        </div>

        <div className="mt-6 flex gap-3 overflow-x-auto">
          {[0, 1, 2].map((i) => (
            <MacScreenshot key={i} index={i} />
          ))}
        </div>

        <div className="mt-6">
          <p className="text-[13px] leading-relaxed text-white/80">
            A voice-native desktop companion for the agent you already run.
            VoiceClaw streams your mic through Gemini Live or OpenAI Realtime,
            calls your brain agent when it needs tools, and keeps your whole
            conversation history local by default.
          </p>
          <ul className="mt-3 space-y-1 text-[13px] text-white/75">
            <li className="flex gap-2">
              <span className="text-[#5BE1E6]">▸</span> BYO-brain — any
              OpenAI-compatible endpoint
            </li>
            <li className="flex gap-2">
              <span className="text-[#5BE1E6]">▸</span> Screen share + voice for
              pair-programming flows
            </li>
            <li className="flex gap-2">
              <span className="text-[#5BE1E6]">▸</span> Menu-bar mode, global
              hotkey, push-to-talk
            </li>
            <li className="flex gap-2">
              <span className="text-[#5BE1E6]">▸</span> MIT licensed, auditable,
              self-hostable relay
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function StatDark({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-white/40">
        {label}
      </p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  )
}

function MacScreenshot({ index }: { index: number }) {
  return (
    <div
      className="shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#0A0E14]"
      style={{ width: 320, aspectRatio: "16 / 10" }}
    >
      {index === 0 ? (
        <MacAppPreviewMain />
      ) : index === 1 ? (
        <MacAppPreviewRouting />
      ) : (
        <MacAppPreviewMenubar />
      )}
    </div>
  )
}

function MacAppPreviewMain() {
  return (
    <div className="flex h-full w-full flex-col bg-[#0A0E14] text-white">
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#0F1520] px-3 py-2">
        <div className="h-2 w-2 rounded-full bg-[#FF5F57]" />
        <div className="h-2 w-2 rounded-full bg-[#FEBC2E]" />
        <div className="h-2 w-2 rounded-full bg-[#28C840]" />
        <div className="ml-2 font-mono text-[9px] text-white/50">
          voiceclaw · live
        </div>
        <div className="ml-auto font-mono text-[9px] text-[#5BE1E6]">
          rtt 42ms
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center gap-6 p-4">
        <MarkIcon className="h-14 w-14" />
        <div>
          <p className="font-mono text-[8px] uppercase tracking-widest text-[#5BE1E6]">
            Listening
          </p>
          <p className="mt-1 text-sm font-semibold">Describe the last commit</p>
          <div className="mt-3 flex items-end gap-[2px]">
            {[6, 14, 22, 10, 18, 24, 14, 8, 20, 12, 6, 16, 22, 8, 18].map(
              (h, i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-[#5BE1E6]"
                  style={{ height: h }}
                />
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MacAppPreviewRouting() {
  return (
    <div className="flex h-full w-full flex-col bg-[#0A0E14] text-white">
      <div className="border-b border-white/10 bg-[#0F1520] px-3 py-2 font-mono text-[9px] text-white/50">
        Routing · Brain endpoint
      </div>
      <div className="flex flex-1 items-center justify-between gap-4 px-6">
        <div className="flex flex-col items-center gap-1">
          <div className="rounded-lg border border-white/20 px-2 py-1 font-mono text-[9px]">
            mic
          </div>
          <p className="text-[9px] text-white/40">capture</p>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1">
          <div className="h-px w-full bg-[#5BE1E6]" />
          <p className="font-mono text-[9px] text-[#5BE1E6]">
            gemini live → ask_brain
          </p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="rounded-lg border border-[#5BE1E6] bg-[#5BE1E6]/10 px-2 py-1 font-mono text-[9px] text-[#5BE1E6]">
            brain
          </div>
          <p className="text-[9px] text-white/40">openclaw</p>
        </div>
      </div>
    </div>
  )
}

function MacAppPreviewMenubar() {
  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-br from-[#1A2540] to-[#0A0E14] p-3 text-white">
      <div className="flex items-center gap-1 self-end rounded-md bg-black/40 px-2 py-1 font-mono text-[8px] text-white/80">
        <MarkIcon className="h-3 w-3" />
        <span>VoiceClaw</span>
        <span className="text-[#5BE1E6]">·</span>
        <span>42ms</span>
      </div>
      <div className="ml-auto mt-1 w-56 rounded-lg border border-white/10 bg-[#0F1520] p-2 text-[9px] shadow-2xl">
        <div className="flex justify-between py-1">
          <span className="text-white/60">Session</span>
          <span className="text-[#5BE1E6]">Live</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-white/60">Model</span>
          <span className="font-mono">gemini-live-2.5</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-white/60">Brain</span>
          <span className="font-mono">openclaw@local</span>
        </div>
        <div className="mt-2 border-t border-white/10 pt-2 font-mono text-[#7BE597]">
          ⌘⇧V · push-to-talk
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Landing page                                                        */
/* ------------------------------------------------------------------ */

function LandingSection() {
  return (
    <Section
      eyebrow="07 / Landing"
      title="voiceclaw.ai — how the home page reads."
      description="A single scrollable page. The headline does the positioning; the sub says what the user has to bring. Primary CTA is Get, not Sign up — there is nothing to sign up to."
    >
      <LandingMock />
    </Section>
  )
}

function LandingMock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0A0E14]">
      {/* chrome */}
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#0F1520] px-4 py-2">
        <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
        <div className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
        <div className="h-3 w-3 rounded-full bg-[#28C840]" />
        <div className="ml-4 flex-1">
          <div className="mx-auto w-fit rounded-md bg-white/5 px-3 py-1 font-mono text-[10px] text-white/50">
            voiceclaw.ai
          </div>
        </div>
      </div>

      <div className="px-12 pt-10">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MarkIcon className="h-6 w-6" />
            <span className="text-sm font-semibold tracking-tight">
              VoiceClaw
            </span>
          </div>
          <div className="flex items-center gap-6 text-[13px] text-white/70">
            <span>Docs</span>
            <span>Download</span>
            <span>Changelog</span>
            <span className="font-mono text-[11px] text-white/40">v1.2</span>
            <button className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-black">
              GitHub
            </button>
          </div>
        </nav>
      </div>

      <div className="relative px-12 py-24">
        <div className="pointer-events-none absolute inset-0 flex items-center opacity-[0.05]">
          {Array.from({ length: 80 }).map((_, i) => {
            const seed =
              (Math.sin(i * 0.6) + Math.sin(i * 0.21) * 0.4) * 0.5 + 0.5
            return (
              <div
                key={i}
                className="mx-[2px] w-[4px] rounded-full bg-[#5BE1E6]"
                style={{ height: `${6 + seed * 180}px` }}
              />
            )
          })}
        </div>
        <div className="relative max-w-4xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#5BE1E6]">
            ○ v1.2.0 — now with screen share
          </p>
          <h1 className="mt-6 font-[family-name:var(--font-geist-sans)] text-[4.5rem] font-semibold leading-[0.95] tracking-[-0.035em]">
            Talk to your agent.
            <br />
            <span className="text-white/35">Not ours.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-xl text-white/70">
            VoiceClaw is a thin voice layer. Point it at any OpenAI-compatible
            endpoint — your own brain, OpenClaw, Hermes, anything — and talk
            naturally from iOS or macOS.
          </p>
          <div className="mt-10 flex items-center gap-3">
            <button className="rounded-md bg-white px-5 py-3 text-sm font-semibold text-black">
              Get for Mac
            </button>
            <button className="rounded-md border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white">
              Install from TestFlight
            </button>
            <span className="ml-3 font-mono text-[11px] text-white/40">
              $ brew install voiceclaw
            </span>
          </div>
          <div className="mt-16 grid grid-cols-4 gap-6 border-t border-white/10 pt-6 text-[11px] font-mono uppercase tracking-widest text-white/40">
            <div>
              <p className="text-[#5BE1E6]">rtt</p>
              <p className="mt-1 text-lg font-semibold normal-case tracking-tight text-white">
                42 ms
              </p>
              <p className="mt-0.5 normal-case tracking-normal text-white/40">
                median round-trip
              </p>
            </div>
            <div>
              <p className="text-[#5BE1E6]">models</p>
              <p className="mt-1 text-lg font-semibold normal-case tracking-tight text-white">
                Gemini, OpenAI
              </p>
              <p className="mt-0.5 normal-case tracking-normal text-white/40">
                realtime providers
              </p>
            </div>
            <div>
              <p className="text-[#5BE1E6]">brains</p>
              <p className="mt-1 text-lg font-semibold normal-case tracking-tight text-white">
                any · byo
              </p>
              <p className="mt-0.5 normal-case tracking-normal text-white/40">
                chat completions
              </p>
            </div>
            <div>
              <p className="text-[#5BE1E6]">license</p>
              <p className="mt-1 text-lg font-semibold normal-case tracking-tight text-white">
                MIT
              </p>
              <p className="mt-0.5 normal-case tracking-normal text-white/40">
                audit it
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Docs page                                                           */
/* ------------------------------------------------------------------ */

function DocsSection() {
  return (
    <Section
      eyebrow="08 / Docs"
      title="docs.voiceclaw.ai — reference, not marketing."
      description="Developer-facing. JetBrains Mono rules the code blocks. Sidebar shows structure, not cleverness. Inline system values (ports, env keys) get cyan."
    >
      <DocsMock />
    </Section>
  )
}

function DocsMock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0A0E14]">
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#0F1520] px-4 py-2">
        <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
        <div className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
        <div className="h-3 w-3 rounded-full bg-[#28C840]" />
        <div className="ml-4 flex-1">
          <div className="mx-auto w-fit rounded-md bg-white/5 px-3 py-1 font-mono text-[10px] text-white/50">
            docs.voiceclaw.ai / guides / bring-your-own-brain
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[240px_1fr]">
        <aside className="border-r border-white/10 bg-[#0F1520] p-5 text-[12px]">
          <div className="flex items-center gap-2">
            <MarkIcon className="h-4 w-4" />
            <p className="text-xs font-semibold">VoiceClaw Docs</p>
          </div>

          <nav className="mt-6 space-y-5">
            <DocsNavGroup
              title="Getting started"
              items={[
                { label: "Install" },
                { label: "Quickstart" },
                { label: "Configuration" },
              ]}
            />
            <DocsNavGroup
              title="Guides"
              items={[
                { label: "BYO-brain", active: true },
                { label: "ask_brain protocol" },
                { label: "Relay deployment" },
                { label: "Screen share" },
              ]}
            />
            <DocsNavGroup
              title="Reference"
              items={[
                { label: "Relay API" },
                { label: "Env variables" },
                { label: "Desktop hotkeys" },
              ]}
            />
          </nav>
        </aside>

        <article className="bg-[#0A0E14] p-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#5BE1E6]">
            Guide
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Bring your own brain
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70">
            VoiceClaw doesn&apos;t ship an agent. It forwards a tool call called{" "}
            <Inline>ask_brain</Inline> to whatever OpenAI-compatible endpoint
            you configure. This guide walks you through pointing VoiceClaw at a
            local agent.
          </p>

          <h2 className="mt-10 text-lg font-semibold">1. Configure the relay</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
            Add your brain endpoint to{" "}
            <Inline>relay-server/.env</Inline>:
          </p>
          <CodeBlock
            lines={[
              "BRAIN_GATEWAY_URL=http://localhost:18789",
              "BRAIN_GATEWAY_AUTH_TOKEN=sk-claw-...",
              "GEMINI_API_KEY=...",
            ]}
          />

          <h2 className="mt-8 text-lg font-semibold">2. Start talking</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
            Press <Inline>⌘⇧V</Inline> anywhere in macOS and start speaking.
            When VoiceClaw hits a tool call it can&apos;t resolve, it forwards
            it to your brain.
          </p>

          <CalloutCard>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#FFB15B]">
              Note
            </p>
            <p className="mt-2 text-sm text-white/80">
              Your brain just needs to accept an OpenAI chat completions request.
              VoiceClaw normalizes the transcript, tool schema, and context
              window for you.
            </p>
          </CalloutCard>
        </article>
      </div>
    </div>
  )
}

function DocsNavGroup({
  title,
  items,
}: {
  title: string
  items: { label: string; active?: boolean }[]
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
        {title}
      </p>
      <ul className="mt-2 space-y-1">
        {items.map((it) => (
          <li
            key={it.label}
            className={`rounded px-2 py-1 ${it.active ? "bg-white/5 text-white" : "text-white/55 hover:text-white/80"}`}
          >
            {it.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Inline({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-white/10 px-1 py-0.5 font-[family-name:var(--font-jetbrains)] text-[12px] text-[#5BE1E6]">
      {children}
    </code>
  )
}

function CodeBlock({ lines }: { lines: string[] }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-4 font-[family-name:var(--font-jetbrains)] text-[12px] leading-relaxed">
      {lines.map((l, i) => (
        <div key={i}>
          <span className="mr-3 text-white/30">{String(i + 1).padStart(2, "0")}</span>
          <span className="text-white/85">{l}</span>
        </div>
      ))}
    </pre>
  )
}

function CalloutCard({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 rounded-lg border border-[#FFB15B]/30 bg-[#FFB15B]/5 p-4">
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Footer note                                                         */
/* ------------------------------------------------------------------ */

function FooterNote() {
  return (
    <section className="border-t border-white/10 px-8 py-16 text-center md:px-16">
      <p className="mx-auto max-w-xl font-[family-name:var(--font-fraunces)] text-lg italic text-white/50">
        &ldquo;Every element must be doing a job. The waveform isn&apos;t
        decoration — it&apos;s the answer to &lsquo;what am I seeing right
        now.&rsquo;&rdquo;
      </p>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
        — Option A · Sonar Dark · designer&apos;s note
      </p>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="border-t border-white/10 px-8 py-20 md:px-16">
      <div className="mx-auto max-w-6xl">
        <header className="mb-12 max-w-3xl">
          {eyebrow && (
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-[#5BE1E6]/70">
              {eyebrow}
            </p>
          )}
          <h2 className="font-[family-name:var(--font-geist-sans)] text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h2>
          {description && (
            <p className="mt-4 text-base leading-relaxed text-white/60 sm:text-lg">
              {description}
            </p>
          )}
        </header>
        {children}
      </div>
    </section>
  )
}
