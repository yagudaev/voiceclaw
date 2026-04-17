import type { CSSProperties, ReactNode, SVGProps } from "react"

const PAGE_VARS = {
  "--paper": "#f1e8da",
  "--paper-strong": "#e8ddcd",
  "--panel": "rgba(255,255,255,0.56)",
  "--panel-strong": "rgba(255,255,255,0.74)",
  "--ink": "#191511",
  "--muted": "#665f58",
  "--line": "rgba(25,21,17,0.12)",
  "--line-strong": "rgba(25,21,17,0.2)",
  "--accent": "#b4492f",
  "--accent-soft": "rgba(180,73,47,0.14)",
  "--shadow": "0 10px 28px rgba(25,21,17,0.05)",
} as CSSProperties

const SWATCHES = [
  {
    name: "Paper",
    hex: "#F1E8DA",
    oklch: "oklch(0.94 0.022 79.5)",
    usage: "Page field, mockup grounds, quiet space",
  },
  {
    name: "Bone",
    hex: "#E8DDCD",
    oklch: "oklch(0.91 0.02 79.1)",
    usage: "Secondary surfaces, cards, device chrome",
  },
  {
    name: "Carbon",
    hex: "#191511",
    oklch: "oklch(0.21 0.015 63)",
    usage: "Body text, icon strokes, app icon base",
  },
  {
    name: "Graphite",
    hex: "#665F58",
    oklch: "oklch(0.5 0.015 63.8)",
    usage: "Annotations, metadata, secondary copy",
  },
  {
    name: "Signal Rust",
    hex: "#B4492F",
    oklch: "oklch(0.58 0.16 39.5)",
    usage: "Single accent for active states and precision cues",
  },
] as const

const TYPOGRAPHY_SPECIMENS = [
  {
    label: "Display Serif",
    family: "font-[family-name:var(--font-fraunces)]",
    sample: "Voice as a precise instrument",
    note: "Fraunces holds the editorial tone, but only at high-leverage moments.",
    sizes: ["72 / -0.05em", "48 / -0.04em", "32 / -0.03em"],
  },
  {
    label: "UI Sans",
    family: "font-[family-name:var(--font-geist-sans)]",
    sample: "Route any OpenAI-compatible agent through a thin voice layer.",
    note: "Geist Sans handles interfaces, listings, buttons, and product language.",
    sizes: ["24 / -0.03em", "18 / -0.01em", "14 / 0em"],
  },
  {
    label: "Data Mono",
    family: "font-[family-name:var(--font-jetbrains)]",
    sample: "SESSION 04 / LATENCY 182MS / ROUTE ACTIVE",
    note: "JetBrains Mono carries system status, measurements, and code.",
    sizes: ["16 / 0em", "13 / 0.03em", "11 / 0.12em"],
  },
] as const

const ICONS = [
  { name: "Mic", note: "capture", component: IconMic },
  { name: "Wave", note: "signal", component: IconWave },
  { name: "Brain", note: "agent", component: IconBrain },
  { name: "Link", note: "bridge", component: IconLink },
  { name: "Route", note: "handoff", component: IconRoute },
  { name: "Tune", note: "control", component: IconTune },
  { name: "Transcript", note: "text", component: IconTranscript },
  { name: "Latency", note: "meter", component: IconLatency },
  { name: "Stack", note: "sessions", component: IconStack },
  { name: "Shield", note: "local", component: IconShield },
] as const

export default function OptionB() {
  return (
    <div
      style={PAGE_VARS}
      className="min-h-screen bg-[var(--paper)] text-[var(--ink)] [background-image:linear-gradient(to_right,var(--line)_1px,transparent_1px)] [background-size:120px_120px]"
    >
      <div className="relative">
        <PageField />
        <HeroSection />
        <MarkSection />
        <ColorSection />
        <TypographySection />
        <IconographySection />
        <IOSIconSection />
        <MacIconSection />
        <IOSStoreSection />
        <MacStoreSection />
        <LandingSection />
        <DocsSection />
      </div>
    </div>
  )
}

function HeroSection() {
  return (
    <section className="relative border-b border-[var(--line-strong)] px-6 py-14 sm:px-10 md:px-16 md:py-20">
      <SectionRules />
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,1.1fr)_380px] lg:gap-16">
        <div>
          <div className="flex flex-wrap items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.26em] text-[var(--muted)]">
            <span className="text-[var(--accent)]">
              Open source. Voice-first. BYO-brain.
            </span>
          </div>

          <div className="mt-10 flex items-start gap-5">
            <div className="rounded-[18px] border border-[var(--line-strong)] bg-[var(--panel-strong)] p-4 shadow-[var(--shadow)]">
              <Mark className="h-14 w-14 text-[var(--ink)]" />
            </div>
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-geist-sans)] text-[11px] uppercase tracking-[0.35em] text-[var(--muted)]">
                VoiceClaw
              </p>
              <h1 className="mt-3 max-w-4xl font-[family-name:var(--font-fraunces)] text-[clamp(3.8rem,9vw,8.4rem)] leading-[0.92] tracking-[-0.05em] text-[var(--ink)]">
                Voice for the agent
                <br />
                you already trust.
              </h1>
            </div>
          </div>

          <p className="mt-8 max-w-2xl font-[family-name:var(--font-geist-sans)] text-lg leading-8 text-[var(--muted)] md:text-xl">
            Talk to your own agent on iPhone and Mac. Point VoiceClaw at any
            OpenAI-compatible endpoint and it minds the mic, the route, and the
            transcript while your agent does the real work.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
            <div className="rounded-[20px] border border-[var(--line-strong)] bg-[var(--panel)] p-6 shadow-[var(--shadow)]">
              <p className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.28em] text-[var(--accent)]">
                Thesis
              </p>
              <p className="mt-3 max-w-2xl font-[family-name:var(--font-fraunces)] text-2xl leading-[1.2] tracking-[-0.03em] text-[var(--ink)] sm:text-[2rem]">
                Warm paper, calm type, clean lines, and one rust signal for the
                part that actually needs your attention.
              </p>
            </div>

            <div className="rounded-[20px] border border-[var(--line-strong)] bg-[color-mix(in_oklch,var(--paper)_65%,white_35%)] p-6 shadow-[var(--shadow)]">
              <p className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.28em] text-[var(--muted)]">
                Mandate
              </p>
              <ul className="mt-4 space-y-3 font-[family-name:var(--font-geist-sans)] text-sm leading-6 text-[var(--muted)]">
                <li>Open source, MIT, BYO-brain.</li>
                <li>No mascot. No glowing-cyan toybox.</li>
                <li>Technical power-users first.</li>
              </ul>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4 lg:pt-8">
          <SignalCard />
          <div className="rounded-[22px] border border-[var(--line-strong)] bg-[var(--panel)] p-6 shadow-[var(--shadow)]">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
              <div>
                <p className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.26em] text-[var(--muted)]">
                  Session flow
                </p>
                <p className="mt-2 font-[family-name:var(--font-geist-sans)] text-sm leading-6 text-[var(--muted)]">
                  Talk, hand it off, read it back.
                </p>
              </div>
              <span className="font-[family-name:var(--font-jetbrains)] text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">
                03
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <StepRow index="01" title="Talk">
                You can tell at a glance when the mic is live.
              </StepRow>
              <StepRow index="02" title="Route">
                VoiceClaw sends the audio to your agent and keeps the handoff tidy.
              </StepRow>
              <StepRow index="03" title="Read">
                The reply comes back as transcript, playback, and controls you can skim.
              </StepRow>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}

function MarkSection() {
  return (
    <Section
      eyebrow="01 / Mark"
      title="An abstract grip, built like a measurement tool."
      description="The mark is not a talon. Two chamfered brackets create enclosure and precision, while three measured bars imply an incoming voice signal the product does not own."
    >
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_340px]">
        <div className="rounded-[24px] border border-[var(--line-strong)] bg-[var(--panel)] p-6 shadow-[var(--shadow)] md:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div className="relative overflow-hidden rounded-[18px] border border-[var(--line-strong)] bg-[color-mix(in_oklch,var(--paper)_78%,white_22%)] p-6">
              <svg viewBox="0 0 560 560" className="aspect-square w-full" fill="none">
                {Array.from({ length: 9 }).map((_, index) => (
                  <path
                    key={`v-${index}`}
                    d={`M${40 + index * 60} 0 V560`}
                    stroke="var(--line)"
                  />
                ))}
                {Array.from({ length: 9 }).map((_, index) => (
                  <path
                    key={`h-${index}`}
                    d={`M0 ${40 + index * 60} H560`}
                    stroke="var(--line)"
                  />
                ))}
                <path
                  d="M170 112 H132 V448 H170"
                  stroke="var(--ink)"
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M170 112 L224 166"
                  stroke="var(--ink)"
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                <path
                  d="M170 448 L224 394"
                  stroke="var(--ink)"
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                <path
                  d="M390 112 H428 V448 H390"
                  stroke="var(--ink)"
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M390 112 L336 166"
                  stroke="var(--ink)"
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                <path
                  d="M390 448 L336 394"
                  stroke="var(--ink)"
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                <path
                  d="M256 332 V228"
                  stroke="var(--accent)"
                  strokeWidth="18"
                  strokeLinecap="round"
                />
                <path
                  d="M296 370 V190"
                  stroke="var(--ink)"
                  strokeWidth="18"
                  strokeLinecap="round"
                />
                <path
                  d="M336 308 V252"
                  stroke="var(--ink)"
                  strokeWidth="18"
                  strokeLinecap="round"
                />
                <path
                  d="M132 448 H428"
                  stroke="var(--line-strong)"
                  strokeDasharray="8 10"
                />
                <path
                  d="M132 112 H428"
                  stroke="var(--line-strong)"
                  strokeDasharray="8 10"
                />
              </svg>
              <div className="mt-4 flex flex-wrap gap-3 font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                <span>8-column field</span>
                <span className="text-[var(--line-strong)]">/</span>
                <span>54px chamfer</span>
                <span className="text-[var(--line-strong)]">/</span>
                <span>3 signal bars</span>
              </div>
            </div>

            <div className="space-y-4">
              <LogoSizeCard label="128 px" detail="Primary lockup">
                <Mark className="h-24 w-24 text-[var(--ink)]" />
              </LogoSizeCard>
              <LogoSizeCard label="64 px" detail="Interface badge">
                <Mark className="h-16 w-16 text-[var(--ink)]" />
              </LogoSizeCard>
              <LogoSizeCard label="24 px" detail="Dock and nav">
                <Mark className="h-8 w-8 text-[var(--ink)]" />
              </LogoSizeCard>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <NoteCard title="Grip, not claw">
            The enclosure is symmetrical and infrastructural. It behaves like a
            bracket, caliper, or mount rather than an animal gesture.
          </NoteCard>
          <NoteCard title="One hot point">
            Only the first signal bar receives accent color. The heat is
            controlled and sparse, never atmospheric.
          </NoteCard>
          <NoteCard title="Works as a tool mark">
            On dark icon grounds the mark becomes a precise instrument plate,
            not a brand sticker.
          </NoteCard>
        </div>
      </div>
    </Section>
  )
}

function ColorSection() {
  return (
    <Section
      eyebrow="02 / Color"
      title="Warm paper, carbon ink, one exact rust."
      description="The palette stays materially grounded so the accent can behave like a control-state indicator instead of a decorative gradient."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {SWATCHES.map((swatch) => (
          <div
            key={swatch.name}
            className="rounded-[20px] border border-[var(--line-strong)] bg-[var(--panel)] p-4 shadow-[var(--shadow)]"
          >
            <div
              className="h-36 rounded-[22px] border border-black/5"
              style={{ backgroundColor: swatch.hex }}
            />
            <div className="mt-4">
              <p className="font-[family-name:var(--font-geist-sans)] text-lg tracking-[-0.02em] text-[var(--ink)]">
                {swatch.name}
              </p>
              <p className="mt-2 font-[family-name:var(--font-jetbrains)] text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                {swatch.hex}
              </p>
              <p className="mt-1 font-[family-name:var(--font-jetbrains)] text-[11px] text-[var(--muted)]">
                {swatch.oklch}
              </p>
              <p className="mt-4 font-[family-name:var(--font-geist-sans)] text-sm leading-6 text-[var(--muted)]">
                {swatch.usage}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

function TypographySection() {
  return (
    <Section
      eyebrow="03 / Typography"
      title="A quiet serif up front, strict system faces underneath."
      description="Fraunces carries the argument. Geist Sans keeps product surfaces modern and exact. JetBrains Mono adds the technical seam that stops the system from becoming soft editorial wallpaper."
    >
      <div className="grid gap-4 xl:grid-cols-3">
        {TYPOGRAPHY_SPECIMENS.map((item) => (
          <div
            key={item.label}
            className="rounded-[20px] border border-[var(--line-strong)] bg-[var(--panel)] p-6 shadow-[var(--shadow)]"
          >
            <div className="border-b border-[var(--line)] pb-4">
              <p className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.26em] text-[var(--accent)]">
                {item.label}
              </p>
              <div className={`mt-5 ${item.family}`}>
                <p
                  className={`leading-[1.02] tracking-[-0.04em] text-[var(--ink)] ${
                    item.label === "Display Serif"
                      ? "text-[3.4rem]"
                      : item.label === "UI Sans"
                        ? "text-[1.65rem]"
                        : "text-[1.02rem] tracking-[0.12em]"
                  }`}
                >
                  {item.sample}
                </p>
              </div>
            </div>
            <p className="mt-4 font-[family-name:var(--font-geist-sans)] text-sm leading-6 text-[var(--muted)]">
              {item.note}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {item.sizes.map((size) => (
                <span
                  key={size}
                  className="rounded-full border border-[var(--line-strong)] px-3 py-1 font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]"
                >
                  {size}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

function IconographySection() {
  return (
    <Section
      eyebrow="04 / Iconography"
      title="Technical icons with one shared stroke language."
      description="Rounded terminals keep the set human enough to use for voice, but each glyph is built from brackets, channels, and measured bars instead of playful pictograms."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {ICONS.map((item) => {
          const Icon = item.component
          return (
            <div
              key={item.name}
              className="rounded-[18px] border border-[var(--line-strong)] bg-[var(--panel)] p-5 shadow-[var(--shadow)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-[18px] border border-[var(--line-strong)] bg-[color-mix(in_oklch,var(--paper)_72%,white_28%)] p-4">
                  <Icon className="h-10 w-10 text-[var(--ink)]" />
                </div>
                <span className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
                  {item.note}
                </span>
              </div>
              <p className="mt-4 font-[family-name:var(--font-geist-sans)] text-base tracking-[-0.02em] text-[var(--ink)]">
                {item.name}
              </p>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

function IOSIconSection() {
  return (
    <Section
      eyebrow="05 / iOS App Icon"
      title="A dark instrument plate inside the iPhone field."
      description="The icon has enough contrast to survive the home screen, but the mark stays exact and infrastructural. No glow, no embossed mascot logic."
    >
      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="rounded-[22px] border border-[var(--line-strong)] bg-[var(--panel)] p-6 shadow-[var(--shadow)]">
          <p className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.28em] text-[var(--accent)]">
            Master tile / 1024 x 1024
          </p>
          <div className="mt-6 flex justify-center rounded-[28px] border border-[var(--line-strong)] bg-[color-mix(in_oklch,var(--paper)_72%,white_28%)] p-8">
            <AppIconArtwork className="w-full max-w-[220px]" platform="ios" />
          </div>
          <p className="mt-5 font-[family-name:var(--font-geist-sans)] text-sm leading-6 text-[var(--muted)]">
            Carbon ground, paper interior stroke, one rust bar for active
            signal. The shape is a squircle with quiet depth rather than a
            glossy badge.
          </p>
        </div>

        <div className="rounded-[24px] border border-[var(--line-strong)] bg-[var(--panel)] p-5 shadow-[var(--shadow)] md:p-8">
          <PhoneContext />
        </div>
      </div>
    </Section>
  )
}

function MacIconSection() {
  return (
    <Section
      eyebrow="06 / macOS App Icon"
      title="The same mark, adapted to dock chrome."
      description="macOS can take more dimensionality, but the move is subtle: a slightly harder plate, a disciplined shadow, and no candy coating."
    >
      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="rounded-[22px] border border-[var(--line-strong)] bg-[var(--panel)] p-6 shadow-[var(--shadow)]">
          <p className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.28em] text-[var(--accent)]">
            Master tile / 1024 x 1024
          </p>
          <div className="mt-6 flex justify-center rounded-[28px] border border-[var(--line-strong)] bg-[color-mix(in_oklch,var(--paper)_72%,white_28%)] p-8">
            <AppIconArtwork className="w-full max-w-[220px]" platform="mac" />
          </div>
          <p className="mt-5 font-[family-name:var(--font-geist-sans)] text-sm leading-6 text-[var(--muted)]">
            The macOS tile uses a firmer edge radius and a soft dock shadow so
            it reads as native without losing the brand&apos;s restraint.
          </p>
        </div>

        <div className="rounded-[24px] border border-[var(--line-strong)] bg-[var(--panel)] p-5 shadow-[var(--shadow)] md:p-8">
          <MacDockContext />
        </div>
      </div>
    </Section>
  )
}

function IOSStoreSection() {
  return (
    <Section
      eyebrow="07 / iOS App Store"
      title="Store presence without selling a fantasy."
      description="The listing reads like a serious utility: clear metadata, plainspoken value proposition, and screenshots that foreground routing and transcription instead of emotional marketing scenes."
    >
      <div className="rounded-[24px] border border-[var(--line-strong)] bg-[var(--panel)] p-5 shadow-[var(--shadow)] md:p-8">
        <div className="overflow-hidden rounded-[20px] border border-[var(--line-strong)] bg-white/[0.75] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
          <div className="border-b border-[var(--line)] px-6 py-5 md:px-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start">
              <div className="shrink-0">
                <AppIconArtwork className="w-24 md:w-28" platform="ios" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="font-[family-name:var(--font-geist-sans)] text-2xl tracking-[-0.04em] text-[var(--ink)]">
                      VoiceClaw
                    </h3>
                    <p className="mt-1 font-[family-name:var(--font-geist-sans)] text-sm text-[var(--muted)]">
                      Voice interface for your own agent
                    </p>
                  </div>
                  <button className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--accent)] px-5 font-[family-name:var(--font-geist-sans)] text-sm font-medium text-white">
                    GET
                  </button>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-4">
                  <StoreMetric label="Rating" value="4.8" detail="2.1K ratings" />
                  <StoreMetric label="Size" value="18.4 MB" detail="Utilities" />
                  <StoreMetric label="Category" value="Developer Tools" detail="Apps" />
                  <StoreMetric label="Age" value="4+" detail="Speech content" />
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 md:px-8">
            <p className="max-w-3xl font-[family-name:var(--font-geist-sans)] text-[15px] leading-7 text-[var(--muted)]">
              VoiceClaw gives your existing agent a clean voice front end.
              Connect any OpenAI-compatible endpoint, watch latency, and keep
              transcripts tidy across mobile sessions.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <PhoneScreenshot label="Route any agent" variant="route" />
              <PhoneScreenshot label="Watch the signal" variant="signal" />
              <PhoneScreenshot label="Keep the transcript" variant="transcript" />
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}

function MacStoreSection() {
  return (
    <Section
      eyebrow="08 / Mac App Store"
      title="Desktop listing as a control surface, not a lifestyle shot."
      description="The Mac listing keeps the same editorial tone, but the screenshots lean into windowed precision and dock-native behavior."
    >
      <div className="rounded-[24px] border border-[var(--line-strong)] bg-[var(--panel)] p-5 shadow-[var(--shadow)] md:p-8">
        <div className="overflow-hidden rounded-[20px] border border-[var(--line-strong)] bg-white/[0.78]">
          <div className="border-b border-[var(--line)] px-6 py-6 md:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="shrink-0">
                <AppIconArtwork className="w-28" platform="mac" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <h3 className="font-[family-name:var(--font-geist-sans)] text-2xl tracking-[-0.04em] text-[var(--ink)]">
                      VoiceClaw
                    </h3>
                    <p className="mt-1 font-[family-name:var(--font-geist-sans)] text-sm text-[var(--muted)]">
                      VoiceClaw Project
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-6">
                    <StoreMetric label="Rating" value="4.9" detail="Mac App Store" />
                    <StoreMetric label="Genre" value="Developer Tools" detail="Utilities" />
                    <StoreMetric label="Size" value="26.2 MB" detail="Universal" />
                  </div>
                </div>
                <p className="mt-6 max-w-3xl font-[family-name:var(--font-geist-sans)] text-[15px] leading-7 text-[var(--muted)]">
                  Voice on macOS for the agent you already run. Route any
                  compatible backend, watch state in a compact desktop window,
                  and keep the app itself out of your way.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 px-6 py-6 md:grid-cols-2 md:px-8">
            <DesktopScreenshot title="Session window" />
            <DesktopScreenshot title="Transcript and settings" variant="settings" />
          </div>
        </div>
      </div>
    </Section>
  )
}

function LandingSection() {
  return (
    <Section
      eyebrow="09 / Landing Page"
      title="voiceclaw.ai framed as a tool for thought."
      description="The home page stays clean and calm, but the tension comes from exact spacing, restrained technical annotations, and a visual that looks like a routed instrument rather than a blob."
    >
      <div className="rounded-[24px] border border-[var(--line-strong)] bg-[var(--panel)] p-5 shadow-[var(--shadow)] md:p-8">
        <BrowserFrame label="voiceclaw.ai">
          <div className="border-b border-[var(--line)] px-6 py-4 font-[family-name:var(--font-geist-sans)] text-sm text-[var(--muted)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Mark className="h-6 w-6 text-[var(--ink)]" />
                <span className="font-medium tracking-[-0.02em] text-[var(--ink)]">
                  VoiceClaw
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <span>Docs</span>
                <span>GitHub</span>
                <span>iOS</span>
                <span>macOS</span>
              </div>
            </div>
          </div>

          <div className="grid gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-10">
            <div>
              <p className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.26em] text-[var(--accent)]">
                Open-source voice layer
              </p>
              <h3 className="mt-5 max-w-3xl font-[family-name:var(--font-fraunces)] text-[clamp(2.8rem,6vw,5.5rem)] leading-[0.94] tracking-[-0.05em] text-[var(--ink)]">
                Bring voice to the agent you already built.
              </h3>
              <p className="mt-6 max-w-2xl font-[family-name:var(--font-geist-sans)] text-lg leading-8 text-[var(--muted)]">
                Connect any OpenAI-compatible backend. Keep the interface fast,
                exact, and out of the way.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--accent)] px-6 font-[family-name:var(--font-geist-sans)] text-sm font-medium text-white">
                  View Docs
                </button>
                <button className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--line-strong)] bg-white/50 px-6 font-[family-name:var(--font-geist-sans)] text-sm font-medium text-[var(--ink)]">
                  Open GitHub
                </button>
              </div>
            </div>

            <div className="rounded-[18px] border border-[var(--line-strong)] bg-[color-mix(in_oklch,var(--paper)_74%,white_26%)] p-5">
              <div className="rounded-[24px] border border-[var(--line-strong)] bg-[var(--ink)] p-5 text-white">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.22em] text-white/55">
                      Active route
                    </p>
                    <p className="mt-2 font-[family-name:var(--font-geist-sans)] text-sm text-white/80">
                      localhost:8787 / agent
                    </p>
                  </div>
                  <span className="rounded-full border border-white/15 px-3 py-1 font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.2em] text-[#f7d9cf]">
                    182 ms
                  </span>
                </div>

                <div className="mt-5 rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-end gap-2">
                    {[18, 34, 52, 80, 60, 42, 24, 18, 44, 78, 54, 28].map(
                      (height, index) => (
                        <span
                          key={`landing-${index}`}
                          className={`block w-full rounded-full ${
                            index === 2 ? "bg-[var(--accent)]" : "bg-[#f4ede7]"
                          }`}
                          style={{ height }}
                        />
                      )
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <SurfaceStat label="Agent" value="BYO" />
                  <SurfaceStat label="Transcript" value="Live" />
                  <SurfaceStat label="Platform" value="iOS / macOS" />
                </div>
              </div>
            </div>
          </div>
        </BrowserFrame>
      </div>
    </Section>
  )
}

function DocsSection() {
  return (
    <Section
      eyebrow="10 / Docs"
      title="Documentation with editorial calm and engineering clarity."
      description="The docs mockup keeps the paper field, but introduces tighter module borders and a dark code slab so the technical center of gravity stays intact."
    >
      <div className="rounded-[24px] border border-[var(--line-strong)] bg-[var(--panel)] p-5 shadow-[var(--shadow)] md:p-8">
        <BrowserFrame label="docs.voiceclaw.ai">
          <div className="border-b border-[var(--line)] px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Mark className="h-5 w-5 text-[var(--ink)]" />
                <span className="font-[family-name:var(--font-geist-sans)] text-sm font-medium text-[var(--ink)]">
                  VoiceClaw Docs
                </span>
              </div>
              <span className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                v1.0 / quickstart
              </span>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="border-b border-[var(--line)] px-6 py-6 lg:border-b-0 lg:border-r">
              <p className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.24em] text-[var(--accent)]">
                Table of contents
              </p>
              <nav className="mt-5 space-y-4 font-[family-name:var(--font-geist-sans)] text-sm text-[var(--muted)]">
                <p className="text-[var(--ink)]">Quickstart</p>
                <p>Agent endpoint</p>
                <p>Routing basics</p>
                <p>Audio devices</p>
                <p>Transcripts</p>
                <p>Latency and logs</p>
                <p>macOS app</p>
                <p>iOS app</p>
              </nav>
            </aside>

            <article className="px-6 py-8 md:px-10">
              <p className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.24em] text-[var(--accent)]">
                Quickstart
              </p>
              <h3 className="mt-4 max-w-3xl font-[family-name:var(--font-fraunces)] text-[2.6rem] leading-[1] tracking-[-0.05em] text-[var(--ink)]">
                Connect VoiceClaw to your own agent endpoint.
              </h3>
              <p className="mt-5 max-w-3xl font-[family-name:var(--font-geist-sans)] text-[15px] leading-7 text-[var(--muted)]">
                VoiceClaw does not ship an assistant. Point the app at any
                OpenAI-compatible agent, verify the route, and the UI will take
                care of capture, playback, and transcript structure.
              </p>

              <div className="mt-8 overflow-hidden rounded-[26px] border border-black/10 bg-[var(--ink)] text-white shadow-[0_24px_60px_rgba(25,21,17,0.18)]">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <span className="font-[family-name:var(--font-geist-sans)] text-sm">
                    config.json
                  </span>
                  <span className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.2em] text-white/45">
                    example
                  </span>
                </div>
                <pre className="overflow-x-auto px-5 py-5 font-[family-name:var(--font-jetbrains)] text-[13px] leading-7 text-[#f2e7db]">
                  <code>{`{
  "transport": "openai-compatible",
  "endpoint": "http://localhost:8787/v1/realtime",
  "apiKey": "dev-only-key",
  "voice": {
    "input": "default-mic",
    "latencyBudgetMs": 200
  }
}`}</code>
                </pre>
              </div>

              <div className="mt-8 grid gap-5 lg:grid-cols-2">
                <DocsCallout title="Route check">
                  Confirm the endpoint with a visible ping before starting any
                  live session.
                </DocsCallout>
                <DocsCallout title="Transcript discipline">
                  Use mono data for metadata and keep natural-language content
                  in the serif/sans body rhythm.
                </DocsCallout>
              </div>
            </article>
          </div>
        </BrowserFrame>
      </div>
    </Section>
  )
}

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="relative border-b border-[var(--line-strong)] px-6 py-14 sm:px-10 md:px-16 md:py-20">
      <SectionRules />
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-12">
          <header className="xl:pt-2">
            <p className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.28em] text-[var(--accent)]">
              {eyebrow}
            </p>
            <h2 className="mt-5 font-[family-name:var(--font-fraunces)] text-[2.4rem] leading-[1.02] tracking-[-0.05em] text-[var(--ink)]">
              {title}
            </h2>
            <p className="mt-5 max-w-sm font-[family-name:var(--font-geist-sans)] text-[15px] leading-7 text-[var(--muted)]">
              {description}
            </p>
          </header>
          <div>{children}</div>
        </div>
      </div>
    </section>
  )
}

function SignalCard() {
  return (
    <div className="rounded-[22px] border border-[var(--line-strong)] bg-[var(--panel)] p-6 shadow-[var(--shadow)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.26em] text-[var(--muted)]">
            Session field
          </p>
          <p className="mt-2 font-[family-name:var(--font-geist-sans)] text-sm text-[var(--muted)]">
            VoiceClaw should feel like a console stripped to essentials.
          </p>
        </div>
        <span className="rounded-full border border-[var(--accent-soft)] bg-[var(--accent-soft)] px-3 py-1 font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
          live
        </span>
      </div>

      <div className="mt-6 rounded-[24px] border border-[var(--line-strong)] bg-[color-mix(in_oklch,var(--paper)_75%,white_25%)] p-5">
        <div className="flex items-end gap-2">
          {[30, 52, 74, 58, 34, 20, 46, 68, 40, 24, 54, 72].map(
            (height, index) => (
              <span
                key={`signal-${index}`}
                className={`block w-full rounded-full ${
                  index === 3 ? "bg-[var(--accent)]" : "bg-[var(--ink)]"
                }`}
                style={{ height }}
              />
            )
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <DataChip label="Latency" value="182ms" />
        <DataChip label="Mode" value="Bridge" />
        <DataChip label="Scope" value="BYO" />
      </div>
    </div>
  )
}

function StepRow({
  index,
  title,
  children,
}: {
  index: string
  title: string
  children: ReactNode
}) {
  return (
    <div className="flex gap-4">
      <span className="mt-1 font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
        {index}
      </span>
      <div>
        <p className="font-[family-name:var(--font-geist-sans)] text-sm font-medium text-[var(--ink)]">
          {title}
        </p>
        <p className="mt-1 font-[family-name:var(--font-geist-sans)] text-sm leading-6 text-[var(--muted)]">
          {children}
        </p>
      </div>
    </div>
  )
}

function LogoSizeCard({
  label,
  detail,
  children,
}: {
  label: string
  detail: string
  children: ReactNode
}) {
  return (
    <div className="rounded-[18px] border border-[var(--line-strong)] bg-[color-mix(in_oklch,var(--paper)_70%,white_30%)] p-5">
      <div className="flex min-h-[100px] items-center justify-center rounded-[22px] border border-[var(--line)] bg-white/55">
        {children}
      </div>
      <div className="mt-4">
        <p className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
          {label}
        </p>
        <p className="mt-1 font-[family-name:var(--font-geist-sans)] text-sm text-[var(--muted)]">
          {detail}
        </p>
      </div>
    </div>
  )
}

function NoteCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="rounded-[20px] border border-[var(--line-strong)] bg-[var(--panel)] p-5 shadow-[var(--shadow)]">
      <p className="font-[family-name:var(--font-geist-sans)] text-lg tracking-[-0.03em] text-[var(--ink)]">
        {title}
      </p>
      <p className="mt-3 font-[family-name:var(--font-geist-sans)] text-sm leading-6 text-[var(--muted)]">
        {children}
      </p>
    </div>
  )
}

function PhoneContext() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mx-auto flex max-w-[420px] justify-center rounded-[48px] border border-[var(--line-strong)] bg-[color-mix(in_oklch,var(--paper)_68%,white_32%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
        <div className="w-full overflow-hidden rounded-[42px] border border-black/10 bg-[linear-gradient(180deg,#2e2925_0%,#0f0d0b_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
          <div className="mx-auto mb-4 h-7 w-28 rounded-full bg-black/50" />
          <div className="grid grid-cols-4 gap-4 px-2 py-3">
            {Array.from({ length: 16 }).map((_, index) => (
              <div
                key={index}
                className={`flex aspect-square items-center justify-center rounded-[28%] ${
                  index === 5
                    ? "bg-transparent"
                    : "bg-white/[0.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                }`}
              >
                {index === 5 ? (
                  <AppIconArtwork className="w-full" platform="ios" />
                ) : (
                  <div className="h-8 w-8 rounded-[26%] bg-white/[0.12]" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-4 gap-4 rounded-[30px] bg-white/[0.08] p-4">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex aspect-square items-center justify-center rounded-[26%] bg-white/[0.12]"
              >
                <div className="h-8 w-8 rounded-[24%] bg-white/[0.14]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MacDockContext() {
  return (
    <div className="overflow-hidden rounded-[32px] border border-[var(--line-strong)] bg-[linear-gradient(180deg,#efe5d7_0%,#ddd0bf_100%)]">
      <div className="h-[320px] bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.7),transparent_42%),linear-gradient(180deg,#f3eadc_0%,#d8c9b3_100%)]" />
      <div className="border-t border-white/50 bg-white/30 px-8 py-6 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-end justify-center gap-4 rounded-[28px] border border-white/40 bg-white/28 px-6 py-4 shadow-[0_18px_40px_rgba(25,21,17,0.08)]">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className={index === 2 ? "-translate-y-3" : ""}>
              {index === 2 ? (
                <AppIconArtwork className="w-24" platform="mac" />
              ) : (
                <div className="h-16 w-16 rounded-[24%] border border-white/35 bg-white/38" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StoreMetric({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div>
      <p className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-geist-sans)] text-lg tracking-[-0.03em] text-[var(--ink)]">
        {value}
      </p>
      <p className="mt-1 font-[family-name:var(--font-geist-sans)] text-xs text-[var(--muted)]">
        {detail}
      </p>
    </div>
  )
}

function PhoneScreenshot({
  label,
  variant,
}: {
  label: string
  variant: "route" | "signal" | "transcript"
}) {
  return (
    <div className="rounded-[28px] border border-[var(--line-strong)] bg-[color-mix(in_oklch,var(--paper)_72%,white_28%)] p-3">
      <div className="rounded-[30px] border border-black/10 bg-[#14110f] p-3 text-white">
        <div className="mx-auto mb-3 h-5 w-20 rounded-full bg-white/10" />
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#211c18] p-4">
          {variant === "route" ? (
            <div className="space-y-3">
              <div className="h-16 rounded-[18px] border border-white/10 bg-white/[0.04] p-3">
                <p className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.2em] text-[#f7d9cf]">
                  Route
                </p>
                <p className="mt-3 font-[family-name:var(--font-geist-sans)] text-sm">
                  localhost:8787 / openai-compatible
                </p>
              </div>
              <div className="h-24 rounded-[18px] border border-white/10 bg-white/[0.04] p-3">
                <div className="grid grid-cols-3 gap-2">
                  <SurfaceStat label="Mode" value="Voice" small />
                  <SurfaceStat label="Agent" value="Custom" small />
                  <SurfaceStat label="Ping" value="182ms" small />
                </div>
              </div>
            </div>
          ) : null}

          {variant === "signal" ? (
            <div className="space-y-4">
              <div className="h-28 rounded-[18px] border border-white/10 bg-white/[0.04] p-4">
                <div className="flex h-full items-end gap-2">
                  {[24, 38, 56, 82, 74, 48, 32, 20, 44, 70].map(
                    (height, index) => (
                      <span
                        key={`phone-${variant}-${index}`}
                        className={`block w-full rounded-full ${
                          index === 3 ? "bg-[var(--accent)]" : "bg-[#f4ede7]"
                        }`}
                        style={{ height }}
                      />
                    )
                  )}
                </div>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-3">
                <p className="font-[family-name:var(--font-geist-sans)] text-sm text-white/80">
                  Speak naturally. The UI stays exact.
                </p>
              </div>
            </div>
          ) : null}

          {variant === "transcript" ? (
            <div className="space-y-3">
              <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-3">
                <p className="font-[family-name:var(--font-geist-sans)] text-sm text-white/80">
                  Can you summarize today&apos;s deploy notes?
                </p>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-[#f4ede7] p-3 text-[var(--ink)]">
                <p className="font-[family-name:var(--font-geist-sans)] text-sm">
                  Release complete. One failed route was retried automatically.
                </p>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-3">
                <p className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.2em] text-[#f7d9cf]">
                  transcript / live
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <p className="mt-3 px-1 font-[family-name:var(--font-geist-sans)] text-sm text-[var(--muted)]">
        {label}
      </p>
    </div>
  )
}

function DesktopScreenshot({
  title,
  variant = "session",
}: {
  title: string
  variant?: "session" | "settings"
}) {
  return (
    <div className="rounded-[28px] border border-[var(--line-strong)] bg-[color-mix(in_oklch,var(--paper)_72%,white_28%)] p-3">
      <div className="overflow-hidden rounded-[22px] border border-black/10 bg-white/85 shadow-[0_16px_30px_rgba(25,21,17,0.08)]">
        <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[#ee6b5d]" />
          <span className="h-3 w-3 rounded-full bg-[#f5bd4f]" />
          <span className="h-3 w-3 rounded-full bg-[#61c554]" />
          <span className="ml-3 font-[family-name:var(--font-geist-sans)] text-sm text-[var(--muted)]">
            {title}
          </span>
        </div>

        <div className="grid gap-0 md:grid-cols-[180px_minmax(0,1fr)]">
          <div className="border-b border-[var(--line)] px-4 py-4 md:border-b-0 md:border-r">
            <div className="space-y-3">
              {["Voice", "Transcript", "Settings", "History"].map((item) => (
                <div
                  key={item}
                  className={`rounded-xl px-3 py-2 font-[family-name:var(--font-geist-sans)] text-sm ${
                    item === "Voice"
                      ? "bg-[var(--accent-soft)] text-[var(--ink)]"
                      : "text-[var(--muted)]"
                  }`}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="p-4">
            {variant === "session" ? (
              <div className="space-y-4">
                <div className="rounded-[18px] border border-[var(--line-strong)] bg-[var(--paper)] p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-[family-name:var(--font-geist-sans)] text-sm text-[var(--muted)]">
                      Agent route
                    </p>
                    <p className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
                      active
                    </p>
                  </div>
                  <p className="mt-3 font-[family-name:var(--font-geist-sans)] text-base text-[var(--ink)]">
                    localhost:8787 / realtime
                  </p>
                </div>
                <div className="rounded-[18px] border border-[var(--line-strong)] bg-[#181512] p-4">
                  <div className="flex items-end gap-2">
                    {[20, 32, 48, 64, 84, 56, 36, 22, 38, 60, 42, 26].map(
                      (height, index) => (
                        <span
                          key={`desktop-${variant}-${index}`}
                          className={`block w-full rounded-full ${
                            index === 4 ? "bg-[var(--accent)]" : "bg-[#f4ede7]"
                          }`}
                          style={{ height }}
                        />
                      )
                    )}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <SurfaceStat label="Input" value="Default mic" />
                  <SurfaceStat label="Output" value="Voice" />
                  <SurfaceStat label="Latency" value="182ms" />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  ["Endpoint", "http://localhost:8787/v1/realtime"],
                  ["Push to talk", "Hold Option + Space"],
                  ["Transcript mode", "Structured"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[18px] border border-[var(--line-strong)] bg-[var(--paper)] p-4"
                  >
                    <p className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                      {label}
                    </p>
                    <p className="mt-3 font-[family-name:var(--font-geist-sans)] text-sm text-[var(--ink)]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function BrowserFrame({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-[var(--line-strong)] bg-white/[0.72] shadow-[0_20px_40px_rgba(25,21,17,0.08)]">
      <div className="flex items-center gap-2 border-b border-[var(--line)] px-5 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ef6b5d]" />
        <span className="h-3 w-3 rounded-full bg-[#f5bd4f]" />
        <span className="h-3 w-3 rounded-full bg-[#61c554]" />
        <div className="ml-4 flex-1 rounded-full border border-[var(--line-strong)] bg-white/60 px-4 py-2 font-[family-name:var(--font-geist-sans)] text-sm text-[var(--muted)]">
          {label}
        </div>
      </div>
      {children}
    </div>
  )
}

function DocsCallout({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="rounded-[22px] border border-[var(--line-strong)] bg-[var(--paper)] p-5">
      <p className="font-[family-name:var(--font-geist-sans)] text-base tracking-[-0.02em] text-[var(--ink)]">
        {title}
      </p>
      <p className="mt-2 font-[family-name:var(--font-geist-sans)] text-sm leading-6 text-[var(--muted)]">
        {children}
      </p>
    </div>
  )
}

function DataChip({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-[20px] border border-[var(--line-strong)] bg-white/50 px-3 py-3">
      <p className="font-[family-name:var(--font-jetbrains)] text-[9px] uppercase tracking-[0.2em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-geist-sans)] text-sm text-[var(--ink)]">
        {value}
      </p>
    </div>
  )
}

function SurfaceStat({
  label,
  value,
  small = false,
}: {
  label: string
  value: string
  small?: boolean
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.05] px-3 py-3">
      <p className="font-[family-name:var(--font-jetbrains)] text-[9px] uppercase tracking-[0.18em] text-white/45">
        {label}
      </p>
      <p
        className={`mt-2 font-[family-name:var(--font-geist-sans)] text-white ${
          small ? "text-xs" : "text-sm"
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function AppIconArtwork({
  className,
  platform,
}: {
  className?: string
  platform: "ios" | "mac"
}) {
  return (
    <div
      className={`aspect-square overflow-hidden border border-white/10 bg-[linear-gradient(180deg,#312a24_0%,#171310_100%)] p-[10%] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_20px_50px_rgba(25,21,17,0.24)] ${
        platform === "ios" ? "rounded-[23%]" : "rounded-[26%]"
      } ${className ?? ""}`}
    >
      <div className="flex h-full w-full items-center justify-center rounded-[22%] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <Mark className="h-[58%] w-[58%] text-[#f4ede7]" accent />
      </div>
    </div>
  )
}

function PageField() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.42),transparent_36%)]"
    />
  )
}

function SectionRules() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,var(--line)_1px,transparent_1px),linear-gradient(to_bottom,var(--line)_1px,transparent_1px)] [background-size:120px_120px]"
    />
  )
}

function Mark({
  className,
  accent = false,
}: {
  className?: string
  accent?: boolean
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      aria-label="VoiceClaw mark"
    >
      <path
        d="M20 10 H14 V54 H20"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 10 L27 17"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M20 54 L27 47"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M44 10 H50 V54 H44"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M44 10 L37 17"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M44 54 L37 47"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M29 40 V24"
        stroke={accent ? "var(--accent)" : "currentColor"}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M35 46 V18"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M41 37 V27"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconMic(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="8" y="3" width="8" height="11" rx="4" strokeWidth="1.8" />
      <path d="M6 11.5V12a6 6 0 0 0 12 0v-.5" strokeWidth="1.8" />
      <path d="M12 18v3" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 21h6" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M15.5 7.5v2.5"
        stroke="var(--accent)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconWave(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M3 13h2l2-5 3 10 3-14 2 9h4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 4v3" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconBrain(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M9 5a3 3 0 0 0-6 1v5a3 3 0 0 0 3 3h1v4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 5a3 3 0 0 1 6 1v5a3 3 0 0 1-3 3h-1v4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 5a3 3 0 0 1 6 0v14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 11h6" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconLink(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M8 8h-1a4 4 0 0 0 0 8h1" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 8h1a4 4 0 0 1 0 8h-1" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 12h8" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M11 9h2" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconRoute(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M5 5h4v4H5z" strokeWidth="1.8" />
      <path d="M15 15h4v4h-4z" strokeWidth="1.8" />
      <path d="M9 7h4a4 4 0 0 1 4 4v4" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M11 7h2" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconTune(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M6 4v16" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 4v16" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18 4v16" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="6" cy="9" r="2.5" strokeWidth="1.8" />
      <circle cx="12" cy="14" r="2.5" stroke="var(--accent)" strokeWidth="1.8" />
      <circle cx="18" cy="8" r="2.5" strokeWidth="1.8" />
    </svg>
  )
}

function IconTranscript(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="3" strokeWidth="1.8" />
      <path d="M8 9h8" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 13h8" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 17h5" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconLatency(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M4 18a8 8 0 1 1 16 0" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 10l3 5" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconStack(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="5" y="5" width="10" height="10" rx="2" strokeWidth="1.8" />
      <rect x="9" y="9" width="10" height="10" rx="2" strokeWidth="1.8" />
      <path d="M12 12h4" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconShield(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M12 4l6 2.5V11c0 4-2.3 7-6 9-3.7-2-6-5-6-9V6.5L12 4z" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9.5 12l1.8 1.8 3.2-3.8" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
