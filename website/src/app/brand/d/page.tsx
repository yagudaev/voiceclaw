import type { ReactNode } from "react"

export default function OptionD() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] selection:bg-[#007AFF]/20">
      <MetaStrip />
      <Hero />
      <WhereItLives />
      <MarkSection />
      <ColorSection />
      <TypographySection />
      <IconSection />
      <IOSIcon />
      <MacIcon />
      <IOSStore />
      <MacStore />
      <Landing />
      <Docs />
      <Footer />
    </div>
  )
}

function MetaStrip() {
  return (
    <div className="border-b border-black/5 bg-white/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 font-[family-name:var(--font-geist-sans)] text-[11px] text-[#6E6E73]">
        <span className="inline-flex items-center gap-2">
          <Dot />
          VoiceClaw
        </span>
        <span>D · Ghost · system-native</span>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section className="border-b border-black/5">
      <div className="mx-auto grid max-w-6xl gap-16 px-6 py-28 md:grid-cols-[1.2fr_1fr] md:gap-20 md:py-40">
        <div>
          <p className="font-[family-name:var(--font-geist-sans)] text-[13px] text-[#6E6E73]">
            VoiceClaw
          </p>
          <h1 className="mt-6 font-[family-name:var(--font-geist-sans)] text-[clamp(3.5rem,8vw,6.5rem)] font-semibold leading-[0.95] tracking-[-0.045em] text-[#1D1D1F]">
            Almost not
            <br />
            there.
          </h1>
          <p className="mt-10 max-w-md font-[family-name:var(--font-geist-sans)] text-[19px] leading-[1.5] text-[#6E6E73]">
            A voice layer for your own agent. It sits in the menu bar, on the
            lock screen, under the volume keys. You forget it's there — which
            is how you know it's working.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <button className="rounded-full bg-[#007AFF] px-5 py-2 font-[family-name:var(--font-geist-sans)] text-[14px] font-medium text-white">
              Install
            </button>
            <button className="rounded-full border border-black/10 bg-white px-5 py-2 font-[family-name:var(--font-geist-sans)] text-[14px] font-medium text-[#1D1D1F]">
              GitHub
            </button>
          </div>
          <p className="mt-6 font-[family-name:var(--font-geist-sans)] text-[12px] text-[#86868B]">
            iOS 17 · macOS 14 · MIT
          </p>
        </div>

        <MacBarFrame />
      </div>
    </section>
  )
}

function MacBarFrame() {
  return (
    <div className="relative">
      <div className="rounded-[20px] border border-black/10 bg-white shadow-[0_30px_60px_-30px_rgba(0,0,0,0.18)]">
        <div className="flex h-7 items-center justify-between border-b border-black/5 bg-[#F7F7F8] px-3 [background-image:linear-gradient(to_bottom,#FDFDFD,#F2F2F4)]">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
            <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
            <span className="h-3 w-3 rounded-full bg-[#28C840]" />
          </div>
          <span className="font-[family-name:var(--font-geist-sans)] text-[11px] text-[#86868B]">
            Finder
          </span>
          <span />
        </div>

        <div className="flex items-center justify-end gap-4 border-b border-black/5 bg-white/80 px-3 py-1.5 backdrop-blur">
          <span className="font-[family-name:var(--font-geist-sans)] text-[11px] font-medium text-[#1D1D1F]">
            Finder
          </span>
          <span className="font-[family-name:var(--font-geist-sans)] text-[11px] text-[#6E6E73]">
            File
          </span>
          <span className="font-[family-name:var(--font-geist-sans)] text-[11px] text-[#6E6E73]">
            Edit
          </span>
          <span className="font-[family-name:var(--font-geist-sans)] text-[11px] text-[#6E6E73]">
            View
          </span>
          <span className="ml-auto flex items-center gap-3 text-[#6E6E73]">
            <MiniSymbol name="wifi" />
            <MiniSymbol name="battery" />
            <span className="inline-flex items-center gap-1 rounded px-1 py-0.5 ring-1 ring-inset ring-black/10">
              <MiniSymbol name="mic" active />
            </span>
            <span className="font-[family-name:var(--font-geist-sans)] text-[11px]">
              Fri 11:52
            </span>
            <MiniSymbol name="spotlight" />
            <MiniSymbol name="control" />
          </span>
        </div>

        <div className="px-5 pb-5 pt-4">
          <div className="rounded-[14px] border border-black/10 bg-white/70 p-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#F5F5F7] ring-1 ring-inset ring-black/10">
                <Dot />
              </div>
              <div className="flex-1">
                <p className="font-[family-name:var(--font-geist-sans)] text-[12px] font-medium text-[#1D1D1F]">
                  VoiceClaw
                </p>
                <p className="font-[family-name:var(--font-geist-sans)] text-[11px] text-[#6E6E73]">
                  Listening · localhost:8787
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#34C759]/10 px-2 py-0.5 text-[10px] font-medium text-[#198754]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#34C759]" />
                Live
              </span>
            </div>
            <div className="mt-3 flex items-end gap-[3px] rounded-md bg-[#F5F5F7] p-2">
              {[12, 22, 38, 54, 68, 44, 28, 18, 14, 26, 48, 62, 54, 34, 20, 12, 18, 30, 40, 28, 16].map(
                (h, i) => (
                  <span
                    key={i}
                    className="w-[3px] rounded-full bg-[#8E8E93]/70"
                    style={{ height: h }}
                  />
                )
              )}
            </div>
          </div>
          <p className="mt-3 font-[family-name:var(--font-geist-sans)] text-[11px] text-[#86868B]">
            Menu bar extra · opens on ⌘ ⌥ V
          </p>
        </div>
      </div>
    </div>
  )
}

function WhereItLives() {
  return (
    <Section eyebrow="Where it lives" title="System-native surfaces. No custom shell.">
      <div className="grid gap-6 md:grid-cols-3">
        <Surface label="macOS menu bar">
          <div className="flex h-24 items-center justify-center rounded-[10px] bg-white ring-1 ring-inset ring-black/10">
            <div className="flex items-center gap-4 rounded-md bg-white/70 px-3 py-1 ring-1 ring-inset ring-black/5 backdrop-blur">
              <MiniSymbol name="wifi" />
              <MiniSymbol name="battery" />
              <span className="inline-flex items-center gap-1 rounded px-1 py-0.5 ring-1 ring-inset ring-[#007AFF]/30">
                <MiniSymbol name="mic" active />
              </span>
              <span className="font-[family-name:var(--font-geist-sans)] text-[11px] text-[#1D1D1F]">
                11:52
              </span>
            </div>
          </div>
          <Caption>
            A single mic glyph. Active-tinted when a session is live. Otherwise
            indistinguishable from the system.
          </Caption>
        </Surface>

        <Surface label="iOS lock screen">
          <LockScreenFrame />
          <Caption>
            Live Activity with waveform preview, route, and a stop control. No
            app chrome.
          </Caption>
        </Surface>

        <Surface label="Control Center">
          <div className="flex h-24 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#DAD9DC] to-[#F2F2F4] ring-1 ring-inset ring-black/10">
            <div className="grid grid-cols-3 gap-2">
              <CcTile accent />
              <CcTile />
              <CcTile />
              <CcTile />
              <CcTile active />
              <CcTile />
            </div>
          </div>
          <Caption>
            One tile, same grid as Airplane Mode and Focus. Tap to toggle. No
            logo.
          </Caption>
        </Surface>
      </div>
    </Section>
  )
}

function MarkSection() {
  return (
    <Section
      eyebrow="01 / Mark"
      title="A dot. That's it."
      description="The smallest unit of presence on a screen. A filled circle with a single hairline ring, scaled against the system dot. It vanishes into SF Symbols grid alignment by design."
    >
      <div className="grid gap-8 md:grid-cols-[1fr_auto]">
        <div className="rounded-2xl bg-white p-10 ring-1 ring-inset ring-black/5">
          <div className="flex items-end justify-between gap-8">
            <MarkSize size={128} />
            <MarkSize size={64} />
            <MarkSize size={32} />
            <MarkSize size={16} />
          </div>
          <div className="mt-8 grid grid-cols-4 gap-2 font-[family-name:var(--font-geist-sans)] text-[11px] text-[#86868B]">
            <span>128 · icon size</span>
            <span>64 · large tile</span>
            <span>32 · sidebar</span>
            <span>16 · menu bar</span>
          </div>
        </div>
        <aside className="space-y-4">
          <Note title="Not a mark, a presence">
            The Ghost's logo is a UI element, not a sticker. It exists where
            your eye already is.
          </Note>
          <Note title="System-aligned">
            Drawn on the SF Symbols 24px grid. Light stroke matches iOS system
            icon weight.
          </Note>
          <Note title="No dark-mode variant">
            The dot adopts system foreground color. Always.
          </Note>
        </aside>
      </div>
    </Section>
  )
}

function ColorSection() {
  return (
    <Section
      eyebrow="02 / Color"
      title="System Gray. And when the system says so, Blue."
      description="No custom palette. Every surface defers to the OS. The only accent is the system tint — whatever the user has picked. Here shown as iOS default blue."
    >
      <div className="grid gap-3 md:grid-cols-5">
        <Swatch name="Label" hex="#1D1D1F" oklch="0.18 0 0" usage="Text, mark fill" ground="bg-[#1D1D1F]" />
        <Swatch
          name="Secondary"
          hex="#6E6E73"
          oklch="0.52 0 0"
          usage="Captions, metadata"
          ground="bg-[#6E6E73]"
        />
        <Swatch
          name="Tertiary"
          hex="#86868B"
          oklch="0.62 0 0"
          usage="Disabled, timestamps"
          ground="bg-[#86868B]"
        />
        <Swatch
          name="Fill"
          hex="#F5F5F7"
          oklch="0.97 0 0"
          usage="Page, surfaces"
          ground="bg-[#F5F5F7]"
          darkText
        />
        <Swatch
          name="Accent / System"
          hex="#007AFF"
          oklch="0.58 0.18 257"
          usage="Primary action, live"
          ground="bg-[#007AFF]"
        />
      </div>
      <p className="mt-6 font-[family-name:var(--font-geist-sans)] text-[12px] text-[#86868B]">
        In dark mode every swatch inverts to the matching system-dark token.
        VoiceClaw never overrides the user's appearance choice.
      </p>
    </Section>
  )
}

function TypographySection() {
  return (
    <Section
      eyebrow="03 / Type"
      title="One typeface. SF Pro in spirit."
      description="A single family does everything. Display, UI, data. No serifs, no contrast, no brand-voice typography. Geist Sans stands in for SF Pro in this mock."
    >
      <div className="rounded-2xl bg-white p-10 ring-1 ring-inset ring-black/5">
        <div className="space-y-10">
          <div>
            <p className="font-[family-name:var(--font-geist-sans)] text-[11px] uppercase tracking-widest text-[#86868B]">
              Display / 72pt semibold · -0.045em
            </p>
            <p className="mt-3 font-[family-name:var(--font-geist-sans)] text-[72px] font-semibold leading-none tracking-[-0.045em]">
              Almost not there.
            </p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-geist-sans)] text-[11px] uppercase tracking-widest text-[#86868B]">
              Body / 17pt regular · -0.01em
            </p>
            <p className="mt-3 max-w-xl font-[family-name:var(--font-geist-sans)] text-[17px] leading-[1.55] tracking-[-0.01em]">
              VoiceClaw is a thin voice layer. Route your mic to any
              OpenAI-compatible endpoint. Your agent, your backend, your keys.
            </p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-geist-sans)] text-[11px] uppercase tracking-widest text-[#86868B]">
              Caption / 11pt regular · 0em
            </p>
            <p className="mt-3 font-[family-name:var(--font-geist-sans)] text-[11px] text-[#6E6E73]">
              Live · localhost:8787 · 182 ms
            </p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-geist-sans)] text-[11px] uppercase tracking-widest text-[#86868B]">
              Mono / 13pt · data only
            </p>
            <p className="mt-3 font-[family-name:var(--font-jetbrains)] text-[13px] text-[#1D1D1F]">
              VOICECLAW_ENDPOINT=https://api.openai.com/v1
            </p>
          </div>
        </div>
      </div>
    </Section>
  )
}

function IconSection() {
  const icons = [
    { label: "mic", sym: <SymMic /> },
    { label: "mic.slash", sym: <SymMicSlash /> },
    { label: "waveform", sym: <SymWaveform /> },
    { label: "link", sym: <SymLink /> },
    { label: "key", sym: <SymKey /> },
    { label: "chevron", sym: <SymChevron /> },
    { label: "gear", sym: <SymGear /> },
    { label: "circle", sym: <SymCircle /> },
    { label: "dot", sym: <SymDot /> },
    { label: "battery", sym: <SymBattery /> },
    { label: "play", sym: <SymPlay /> },
    { label: "stop", sym: <SymStop /> },
  ]
  return (
    <Section
      eyebrow="04 / Icons"
      title="Whatever SF Symbols would draw."
      description="Thin-line, consistent weight, 24px grid, no brand-custom metaphors. If SF Symbols has one, we use it. If it doesn't, we draw in the same grammar."
    >
      <div className="grid grid-cols-4 gap-3 rounded-2xl bg-white p-8 ring-1 ring-inset ring-black/5 md:grid-cols-6">
        {icons.map((it) => (
          <div
            key={it.label}
            className="flex flex-col items-center gap-2 rounded-xl border border-black/5 bg-[#FAFAFC] py-4"
          >
            <div className="text-[#1D1D1F]">{it.sym}</div>
            <span className="font-[family-name:var(--font-jetbrains)] text-[10px] text-[#86868B]">
              {it.label}
            </span>
          </div>
        ))}
      </div>
    </Section>
  )
}

function IOSIcon() {
  return (
    <Section
      eyebrow="05 / iOS app icon"
      title="A dot on a gradient squircle."
      description="1024×1024, the mark centered, drawn at the SF icon scale. On the home screen it reads as a utility, not a destination."
    >
      <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-start">
        <IosIconArtTile />
        <IosHomeScreen />
      </div>
    </Section>
  )
}

function MacIcon() {
  return (
    <Section
      eyebrow="06 / macOS app icon"
      title="Same dot. Tilted light."
      description="1024×1024 on a neutral rounded-square base with Apple's canonical light-from-top shadow. The menu bar sibling is the 22px template variant."
    >
      <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-start">
        <MacIconArtTile />
        <MacDockRow />
      </div>
    </Section>
  )
}

function IOSStore() {
  return (
    <Section
      eyebrow="07 / iOS App Store"
      title="It looks like every other Utility."
      description="No custom brand copy, no attention-seeking screenshots. The listing is written so a user installs it, puts it in Control Center, and forgets about it."
    >
      <div className="overflow-hidden rounded-[20px] border border-black/5 bg-white shadow-[0_30px_60px_-30px_rgba(0,0,0,0.12)]">
        <div className="flex items-start gap-5 border-b border-black/5 px-6 py-5">
          <div className="shrink-0">
            <IosIconArt size={96} radius={22} />
          </div>
          <div className="flex-1">
            <p className="font-[family-name:var(--font-geist-sans)] text-[20px] font-semibold leading-tight text-[#1D1D1F]">
              VoiceClaw
            </p>
            <p className="font-[family-name:var(--font-geist-sans)] text-[13px] text-[#6E6E73]">
              Voice for your own agent
            </p>
            <p className="mt-3 font-[family-name:var(--font-geist-sans)] text-[12px] text-[#86868B]">
              Nano3 Labs · Utilities · 4+
            </p>
            <div className="mt-4 flex items-center gap-3">
              <button className="rounded-full bg-[#007AFF] px-5 py-1 font-[family-name:var(--font-geist-sans)] text-[13px] font-medium text-white">
                Get
              </button>
              <span className="font-[family-name:var(--font-geist-sans)] text-[12px] text-[#86868B]">
                In-App Purchases
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 border-b border-black/5 px-6 py-5 md:grid-cols-3">
          <Stat label="Rating" value="4.8" caption="3.2K Ratings" />
          <Stat label="Age" value="4+" caption="Years Old" />
          <Stat label="Category" value="#12" caption="Utilities" />
        </div>

        <div className="grid gap-4 px-6 py-5 md:grid-cols-3">
          <PhoneScreenshot variant="control" />
          <PhoneScreenshot variant="lock" />
          <PhoneScreenshot variant="settings" />
        </div>

        <div className="border-t border-black/5 px-6 py-5">
          <p className="font-[family-name:var(--font-geist-sans)] text-[14px] leading-[1.55] text-[#3A3A3C]">
            Route your voice to any OpenAI-compatible endpoint. VoiceClaw adds a
            Control Center tile, a Live Activity, and a Shortcut — nothing
            else. No account, no cloud, no data collection.
          </p>
          <ul className="mt-4 space-y-1.5 font-[family-name:var(--font-geist-sans)] text-[13px] text-[#6E6E73]">
            <li>· Bring-your-own endpoint and API key</li>
            <li>· Works on lock screen via Live Activity</li>
            <li>· Ships as a Shortcut action</li>
            <li>· 100% on-device routing, open source</li>
          </ul>
        </div>
      </div>
    </Section>
  )
}

function MacStore() {
  return (
    <Section
      eyebrow="08 / Mac App Store"
      title="A menu bar extra, documented like Apple would."
      description="One primary window, one menu bar glyph. The listing sells it as a system utility, not a platform."
    >
      <div className="overflow-hidden rounded-[22px] border border-black/5 bg-white shadow-[0_30px_60px_-30px_rgba(0,0,0,0.12)]">
        <div className="flex items-center gap-3 border-b border-black/5 bg-[#F5F5F7] px-4 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          <span className="ml-4 font-[family-name:var(--font-geist-sans)] text-[12px] text-[#6E6E73]">
            Mac App Store — VoiceClaw
          </span>
        </div>

        <div className="grid gap-6 px-8 py-8 md:grid-cols-[auto_1fr]">
          <MacIconArt size={128} />
          <div>
            <p className="font-[family-name:var(--font-geist-sans)] text-[26px] font-semibold tracking-tight text-[#1D1D1F]">
              VoiceClaw for Mac
            </p>
            <p className="font-[family-name:var(--font-geist-sans)] text-[14px] text-[#6E6E73]">
              Menu bar voice extra
            </p>
            <p className="mt-2 font-[family-name:var(--font-geist-sans)] text-[12px] text-[#86868B]">
              By Nano3 Labs · Utilities · 14.2 MB · macOS 14.0 or later
            </p>
            <div className="mt-4 flex items-center gap-3">
              <button className="rounded-full bg-[#007AFF] px-5 py-1 font-[family-name:var(--font-geist-sans)] text-[13px] font-medium text-white">
                Open
              </button>
              <span className="font-[family-name:var(--font-geist-sans)] text-[12px] text-[#86868B]">
                ★ 4.9 · 812 ratings
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-t border-black/5 px-8 py-6 md:grid-cols-2">
          <MacWindowShot variant="popover" />
          <MacWindowShot variant="settings" />
        </div>

        <div className="border-t border-black/5 px-8 py-6">
          <p className="font-[family-name:var(--font-geist-sans)] text-[14px] leading-[1.55] text-[#3A3A3C]">
            A single menu bar item. ⌘ ⌥ V to talk. VoiceClaw streams your
            voice to any OpenAI-compatible endpoint and shows the transcript
            in a compact popover. That's the whole product.
          </p>
        </div>
      </div>
    </Section>
  )
}

function Landing() {
  return (
    <Section
      eyebrow="09 / Landing"
      title="voiceclaw.ai — almost empty, almost finished."
      description="One line, one primary action, one secondary link. The landing page should feel like a System Settings pane, not a pitch."
    >
      <div className="overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_30px_60px_-30px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-2 border-b border-black/5 bg-[#F2F2F4] px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          <div className="ml-4 flex-1 rounded-md bg-white px-3 py-1 font-[family-name:var(--font-geist-sans)] text-[12px] text-[#6E6E73] ring-1 ring-inset ring-black/10">
            voiceclaw.ai
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-black/5 px-8 py-5">
          <span className="inline-flex items-center gap-2 font-[family-name:var(--font-geist-sans)] text-[14px] text-[#1D1D1F]">
            <Dot />
            VoiceClaw
          </span>
          <div className="flex items-center gap-6 font-[family-name:var(--font-geist-sans)] text-[13px] text-[#6E6E73]">
            <span>Docs</span>
            <span>GitHub</span>
            <span>Download</span>
          </div>
        </div>

        <div className="flex min-h-[420px] flex-col items-center justify-center gap-6 px-8 py-24 text-center">
          <h3 className="max-w-2xl font-[family-name:var(--font-geist-sans)] text-[clamp(2.5rem,5vw,4.5rem)] font-semibold leading-[1] tracking-[-0.045em] text-[#1D1D1F]">
            Talk to your agent.
          </h3>
          <p className="max-w-md font-[family-name:var(--font-geist-sans)] text-[17px] leading-[1.55] text-[#6E6E73]">
            One menu bar icon. One Live Activity. Your own endpoint.
          </p>
          <div className="flex items-center gap-3">
            <button className="rounded-full bg-[#007AFF] px-6 py-2 font-[family-name:var(--font-geist-sans)] text-[14px] font-medium text-white">
              Download for Mac
            </button>
            <button className="rounded-full border border-black/10 bg-white px-6 py-2 font-[family-name:var(--font-geist-sans)] text-[14px] font-medium text-[#1D1D1F]">
              App Store
            </button>
          </div>
          <p className="font-[family-name:var(--font-geist-sans)] text-[12px] text-[#86868B]">
            Free · open source · no account
          </p>
        </div>
      </div>
    </Section>
  )
}

function Docs() {
  return (
    <Section
      eyebrow="10 / Docs"
      title="Docs in the system-settings register."
      description="Plain hierarchy, no brand atmospherics, code in a standard mono inline block. Reads like developer.apple.com more than like a startup blog."
    >
      <div className="overflow-hidden rounded-[20px] border border-black/5 bg-white shadow-[0_30px_60px_-30px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3 border-b border-black/5 bg-[#F2F2F4] px-4 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          <span className="ml-4 font-[family-name:var(--font-geist-sans)] text-[12px] text-[#6E6E73]">
            docs.voiceclaw.ai
          </span>
        </div>

        <div className="grid grid-cols-[220px_1fr]">
          <aside className="border-r border-black/5 p-6">
            <p className="font-[family-name:var(--font-geist-sans)] text-[11px] font-medium uppercase tracking-wide text-[#86868B]">
              Quickstart
            </p>
            <nav className="mt-3 flex flex-col gap-1.5 font-[family-name:var(--font-geist-sans)] text-[13px]">
              <span className="rounded-md bg-[#007AFF]/8 px-2 py-1 font-medium text-[#007AFF]">
                Install
              </span>
              <span className="px-2 py-1 text-[#3A3A3C]">Endpoint</span>
              <span className="px-2 py-1 text-[#3A3A3C]">Shortcut</span>
              <span className="px-2 py-1 text-[#3A3A3C]">Live Activity</span>
            </nav>
            <p className="mt-6 font-[family-name:var(--font-geist-sans)] text-[11px] font-medium uppercase tracking-wide text-[#86868B]">
              Reference
            </p>
            <nav className="mt-3 flex flex-col gap-1.5 font-[family-name:var(--font-geist-sans)] text-[13px] text-[#3A3A3C]">
              <span className="px-2 py-1">Configuration file</span>
              <span className="px-2 py-1">Keyboard shortcuts</span>
              <span className="px-2 py-1">CLI flags</span>
            </nav>
          </aside>

          <article className="p-10">
            <p className="font-[family-name:var(--font-geist-sans)] text-[12px] font-medium uppercase tracking-wide text-[#007AFF]">
              Quickstart
            </p>
            <h4 className="mt-3 font-[family-name:var(--font-geist-sans)] text-[30px] font-semibold tracking-tight text-[#1D1D1F]">
              Install
            </h4>
            <p className="mt-4 max-w-xl font-[family-name:var(--font-geist-sans)] text-[15px] leading-[1.65] text-[#3A3A3C]">
              VoiceClaw ships as a notarized menu bar application on macOS and
              a utility app on iOS. After install, add your endpoint URL and
              API key in Settings → VoiceClaw. Nothing else is required.
            </p>
            <h5 className="mt-8 font-[family-name:var(--font-geist-sans)] text-[16px] font-semibold text-[#1D1D1F]">
              macOS
            </h5>
            <pre className="mt-3 overflow-x-auto rounded-[10px] bg-[#F5F5F7] p-4 font-[family-name:var(--font-jetbrains)] text-[12.5px] leading-[1.6] text-[#1D1D1F] ring-1 ring-inset ring-black/5">
{`brew install --cask voiceclaw
open -a VoiceClaw
# menu bar icon appears. ⌘ ⌥ V to talk.`}
            </pre>
            <h5 className="mt-8 font-[family-name:var(--font-geist-sans)] text-[16px] font-semibold text-[#1D1D1F]">
              iOS
            </h5>
            <p className="mt-3 max-w-xl font-[family-name:var(--font-geist-sans)] text-[15px] leading-[1.65] text-[#3A3A3C]">
              Install from the App Store. Add the Control Center tile from
              Settings → Control Center. Long-press the tile to set your
              endpoint.
            </p>
          </article>
        </div>
      </div>
    </Section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-black/5 bg-white/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 font-[family-name:var(--font-geist-sans)] text-[12px] text-[#86868B]">
        <span className="inline-flex items-center gap-2">
          <Dot />
          VoiceClaw · The Ghost
        </span>
        <span>Open source · MIT · Nano3 Labs</span>
      </div>
    </footer>
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
  description?: string
  children: ReactNode
}) {
  return (
    <section className="border-b border-black/5">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-[260px_1fr] md:gap-14">
          <div>
            <p className="font-[family-name:var(--font-geist-sans)] text-[11px] font-medium uppercase tracking-[0.18em] text-[#86868B]">
              {eyebrow}
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-geist-sans)] text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#1D1D1F]">
              {title}
            </h2>
            {description && (
              <p className="mt-4 font-[family-name:var(--font-geist-sans)] text-[14px] leading-[1.55] text-[#6E6E73]">
                {description}
              </p>
            )}
          </div>
          <div>{children}</div>
        </div>
      </div>
    </section>
  )
}

function Surface({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-inset ring-black/5">
      <p className="mb-3 font-[family-name:var(--font-geist-sans)] text-[11px] font-medium uppercase tracking-wide text-[#86868B]">
        {label}
      </p>
      {children}
    </div>
  )
}

function Caption({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 font-[family-name:var(--font-geist-sans)] text-[12.5px] leading-[1.5] text-[#6E6E73]">
      {children}
    </p>
  )
}

function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-inset ring-black/5">
      <p className="font-[family-name:var(--font-geist-sans)] text-[13px] font-semibold text-[#1D1D1F]">
        {title}
      </p>
      <p className="mt-1.5 font-[family-name:var(--font-geist-sans)] text-[12.5px] leading-[1.55] text-[#6E6E73]">
        {children}
      </p>
    </div>
  )
}

function Swatch({
  name,
  hex,
  oklch,
  usage,
  ground,
  darkText,
}: {
  name: string
  hex: string
  oklch: string
  usage: string
  ground: string
  darkText?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-inset ring-black/5">
      <div className={`flex h-24 items-end justify-start p-3 ${ground}`}>
        <span
          className={`font-[family-name:var(--font-geist-sans)] text-[12px] font-medium ${
            darkText ? "text-[#1D1D1F]" : "text-white"
          }`}
        >
          {name}
        </span>
      </div>
      <div className="space-y-1 bg-white px-3 py-3">
        <p className="font-[family-name:var(--font-jetbrains)] text-[10.5px] text-[#1D1D1F]">
          {hex}
        </p>
        <p className="font-[family-name:var(--font-jetbrains)] text-[10.5px] text-[#6E6E73]">
          oklch({oklch})
        </p>
        <p className="font-[family-name:var(--font-geist-sans)] text-[11px] text-[#86868B]">
          {usage}
        </p>
      </div>
    </div>
  )
}

function MarkSize({ size }: { size: number }) {
  return (
    <div className="flex items-end justify-center">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" stroke="#1D1D1F" strokeWidth="0.75" />
        <circle cx="12" cy="12" r="5.25" fill="#1D1D1F" />
      </svg>
    </div>
  )
}

function Dot() {
  return (
    <span className="relative inline-flex h-3 w-3 items-center justify-center">
      <span className="absolute inset-0 rounded-full ring-[0.5px] ring-inset ring-[#1D1D1F]/60" />
      <span className="h-1.5 w-1.5 rounded-full bg-[#1D1D1F]" />
    </span>
  )
}

function Stat({
  label,
  value,
  caption,
}: {
  label: string
  value: string
  caption: string
}) {
  return (
    <div className="flex flex-col items-start border-l border-black/5 pl-4 first:border-l-0 first:pl-0">
      <p className="font-[family-name:var(--font-geist-sans)] text-[10px] font-medium uppercase tracking-wide text-[#86868B]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-geist-sans)] text-[22px] font-semibold text-[#1D1D1F]">
        {value}
      </p>
      <p className="font-[family-name:var(--font-geist-sans)] text-[11px] text-[#6E6E73]">
        {caption}
      </p>
    </div>
  )
}

function MiniSymbol({
  name,
  active,
}: {
  name: "wifi" | "battery" | "mic" | "spotlight" | "control"
  active?: boolean
}) {
  const color = active ? "#007AFF" : "#6E6E73"
  if (name === "wifi") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 9a14 14 0 0 1 18 0M6.5 12.5a9 9 0 0 1 11 0M10 16a4 4 0 0 1 4 0"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="12" cy="19" r="1.2" fill={color} />
      </svg>
    )
  }
  if (name === "battery") {
    return (
      <svg width="18" height="10" viewBox="0 0 24 12" fill="none">
        <rect x="0.5" y="0.5" width="20" height="11" rx="2" stroke={color} />
        <rect x="2" y="2" width="14" height="8" rx="1" fill={color} />
        <rect x="22" y="4" width="1.5" height="4" rx="0.5" fill={color} />
      </svg>
    )
  }
  if (name === "mic") {
    return (
      <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
        <rect x="3.5" y="1" width="5" height="7" rx="2.5" fill={color} />
        <path
          d="M1.5 7.5a4.5 4.5 0 0 0 9 0M6 12v2"
          stroke={color}
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    )
  }
  if (name === "spotlight") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <circle cx="10" cy="10" r="6" stroke={color} strokeWidth="1.5" />
        <path d="m15 15 5 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="8" height="8" rx="2" fill={color} />
      <rect x="13" y="3" width="8" height="8" rx="2" fill={color} opacity="0.6" />
      <rect x="3" y="13" width="8" height="8" rx="2" fill={color} opacity="0.6" />
      <rect x="13" y="13" width="8" height="8" rx="2" fill={color} opacity="0.4" />
    </svg>
  )
}

function CcTile({ active, accent }: { active?: boolean; accent?: boolean }) {
  return (
    <div
      className={`flex h-8 w-8 items-center justify-center rounded-[10px] backdrop-blur ${
        active
          ? "bg-[#007AFF] text-white"
          : accent
            ? "bg-white/70 text-[#1D1D1F]"
            : "bg-white/40 text-[#1D1D1F]"
      }`}
    >
      {active ? (
        <MiniSymbol name="mic" active />
      ) : (
        <span className="h-2 w-2 rounded-full bg-[#1D1D1F]/40" />
      )}
    </div>
  )
}

function LockScreenFrame() {
  return (
    <div className="mx-auto flex h-48 w-28 flex-col items-center justify-between overflow-hidden rounded-[22px] bg-gradient-to-br from-[#1F2731] to-[#0C1218] p-2 text-white">
      <p className="mt-1 font-[family-name:var(--font-geist-sans)] text-[10px] opacity-80">
        Fri, Apr 17
      </p>
      <p className="-mt-2 font-[family-name:var(--font-geist-sans)] text-[30px] font-semibold leading-none">
        11:52
      </p>
      <div className="w-full rounded-[14px] bg-black/50 px-2 py-1.5 backdrop-blur-xl">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-[5px] bg-white/15">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          <span className="text-[8px] font-medium">VoiceClaw</span>
          <span className="ml-auto inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#FF3B30]">
            <span className="block h-1.5 w-1.5 rounded-[1px] bg-white" />
          </span>
        </div>
        <div className="mt-1.5 flex items-end gap-[1px]">
          {[4, 8, 14, 18, 12, 6, 4, 9, 14, 18, 14, 6, 3, 8, 12, 10, 6, 4].map((h, i) => (
            <span
              key={i}
              className="w-[2px] rounded-full bg-white/70"
              style={{ height: h }}
            />
          ))}
        </div>
        <p className="mt-1 text-[7px] text-white/60">
          Live · 182 ms · localhost
        </p>
      </div>
    </div>
  )
}

function IosIconArt({
  size = 180,
  radius = 40,
}: {
  size?: number
  radius?: number
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" className="block">
      <defs>
        <linearGradient id="d-ios-bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#F2F2F5" />
          <stop offset="100%" stopColor="#D4D4D9" />
        </linearGradient>
      </defs>
      <rect width="180" height="180" rx={radius} fill="url(#d-ios-bg)" />
      <circle cx="90" cy="90" r="62" stroke="#1D1D1F" strokeWidth="2" fill="none" />
      <circle cx="90" cy="90" r="26" fill="#1D1D1F" />
    </svg>
  )
}

function IosIconArtTile() {
  return (
    <div className="rounded-2xl bg-white p-6 ring-1 ring-inset ring-black/5">
      <IosIconArt />
      <p className="mt-4 font-[family-name:var(--font-geist-sans)] text-[12px] text-[#86868B]">
        1024 × 1024 · squircle mask
      </p>
    </div>
  )
}

function IosHomeScreen() {
  const apps = [
    { name: "Messages", color: "linear-gradient(180deg,#86F59F,#39C256)", glyph: "" },
    { name: "Maps", color: "linear-gradient(180deg,#C4F4D0,#8DD3A4)", glyph: "" },
    { name: "Calendar", color: "#FFFFFF", glyph: "17" },
    { name: "Photos", color: "linear-gradient(135deg,#FFCB4B,#FF6AAA,#6BD6FF,#6AE0A6)", glyph: "" },
    { name: "VoiceClaw", voice: true },
    { name: "Settings", color: "linear-gradient(180deg,#D1D1D6,#8E8E93)", glyph: "" },
    { name: "Safari", color: "linear-gradient(180deg,#F2F2F4,#DDDDE1)", glyph: "" },
    { name: "Mail", color: "linear-gradient(180deg,#5EB4FF,#0A78FF)", glyph: "" },
  ]
  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[36px] border border-black/10 bg-[linear-gradient(160deg,#D6E4F3,#C7CBDB_60%,#AE9DB4)] p-5 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)]">
      <div className="flex justify-between px-2 font-[family-name:var(--font-geist-sans)] text-[11px] font-medium text-white/95">
        <span>11:52</span>
        <span className="inline-flex items-center gap-1">
          <span className="text-[10px]">●●●●</span>
          <span className="opacity-90">LTE</span>
          <span className="opacity-90">83%</span>
        </span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-4">
        {apps.map((app) => (
          <div key={app.name} className="flex flex-col items-center gap-1">
            {app.voice ? (
              <div className="h-14 w-14">
                <IosIconArt size={56} radius={14} />
              </div>
            ) : (
              <div
                className="h-14 w-14 rounded-[14px] shadow-[0_4px_12px_-4px_rgba(0,0,0,0.2)]"
                style={{ background: app.color }}
              />
            )}
            <span className="font-[family-name:var(--font-geist-sans)] text-[9.5px] font-medium text-white">
              {app.name}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-[22px] bg-white/20 p-2 backdrop-blur-xl">
        <div className="grid grid-cols-4 gap-4">
          {["Phone", "Messages", "Safari", "Camera"].map((n) => (
            <div key={n} className="flex flex-col items-center gap-1">
              <div className="h-12 w-12 rounded-[12px] bg-white/30" />
              <span className="font-[family-name:var(--font-geist-sans)] text-[9.5px] text-white">
                {n}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MacIconArt({ size = 180 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" className="block drop-shadow-[0_10px_20px_rgba(0,0,0,0.15)]">
      <defs>
        <linearGradient id="d-mac-bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#FAFAFC" />
          <stop offset="100%" stopColor="#C8C8CE" />
        </linearGradient>
        <linearGradient id="d-mac-inner" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#292A2D" />
          <stop offset="100%" stopColor="#0E0F11" />
        </linearGradient>
      </defs>
      <rect width="180" height="180" rx="36" fill="url(#d-mac-bg)" />
      <rect x="4" y="4" width="172" height="172" rx="32" stroke="black" strokeOpacity="0.06" fill="none" />
      <circle cx="90" cy="90" r="62" stroke="url(#d-mac-inner)" strokeWidth="2" fill="white" fillOpacity="0.4" />
      <circle cx="90" cy="90" r="26" fill="url(#d-mac-inner)" />
    </svg>
  )
}

function MacIconArtTile() {
  return (
    <div className="rounded-2xl bg-white p-6 ring-1 ring-inset ring-black/5">
      <MacIconArt />
      <p className="mt-4 font-[family-name:var(--font-geist-sans)] text-[12px] text-[#86868B]">
        1024 × 1024 · rounded square
      </p>
    </div>
  )
}

function MacDockRow() {
  const apps = [
    "#5EB4FF",
    "#34C759",
    "#FF9F0A",
    "voice",
    "#AF52DE",
    "#FF375F",
    "#30D158",
  ]
  return (
    <div className="overflow-hidden rounded-[22px] border border-white/30 bg-white/40 p-4 backdrop-blur-xl shadow-[0_30px_60px_-30px_rgba(0,0,0,0.2)]">
      <p className="mb-3 font-[family-name:var(--font-geist-sans)] text-[11px] text-[#86868B]">
        Dock · macOS 14 translucent
      </p>
      <div className="flex items-end gap-3">
        {apps.map((c, i) =>
          c === "voice" ? (
            <div key={i} className="h-16 w-16">
              <MacIconArt size={64} />
            </div>
          ) : (
            <div
              key={i}
              className="h-16 w-16 rounded-[14px] shadow-[0_10px_20px_-10px_rgba(0,0,0,0.25)]"
              style={{ background: c }}
            />
          )
        )}
      </div>
      <div className="mt-4 border-t border-white/30 pt-2">
        <p className="font-[family-name:var(--font-geist-sans)] text-[11px] text-[#86868B]">
          Menu bar template (22 × 22):
        </p>
        <div className="mt-2 inline-flex h-7 items-center gap-2 rounded-md bg-white/70 px-2 ring-1 ring-inset ring-black/5 backdrop-blur">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#1D1D1F" strokeWidth="1" />
            <circle cx="12" cy="12" r="5" fill="#1D1D1F" />
          </svg>
          <span className="font-[family-name:var(--font-geist-sans)] text-[11px] text-[#1D1D1F]">
            VoiceClaw
          </span>
        </div>
      </div>
    </div>
  )
}

function PhoneScreenshot({
  variant,
}: {
  variant: "control" | "lock" | "settings"
}) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-black/10 bg-[linear-gradient(160deg,#1A2330,#0B1017)] p-3">
      <div className="mb-2 flex items-center justify-between font-[family-name:var(--font-geist-sans)] text-[9px] text-white/80">
        <span>11:52</span>
        <span>●●●● 83%</span>
      </div>
      {variant === "control" && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`h-12 rounded-[10px] backdrop-blur ${
                  i === 4 ? "bg-[#007AFF]" : "bg-white/10"
                }`}
              />
            ))}
          </div>
          <div className="rounded-[14px] bg-white/10 p-3 backdrop-blur">
            <p className="font-[family-name:var(--font-geist-sans)] text-[9px] text-white/70">
              VoiceClaw
            </p>
            <p className="font-[family-name:var(--font-geist-sans)] text-[10px] font-medium text-white">
              Live · 182 ms
            </p>
          </div>
        </div>
      )}
      {variant === "lock" && (
        <div className="flex flex-col items-center gap-3 pt-6">
          <p className="font-[family-name:var(--font-geist-sans)] text-[10px] text-white/70">
            Friday · Apr 17
          </p>
          <p className="font-[family-name:var(--font-geist-sans)] text-[42px] font-semibold leading-none text-white">
            11:52
          </p>
          <div className="w-full rounded-[14px] bg-black/40 p-3 backdrop-blur-xl">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-[5px] bg-white/15">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              <span className="font-[family-name:var(--font-geist-sans)] text-[9px] font-medium text-white">
                VoiceClaw
              </span>
              <span className="ml-auto font-[family-name:var(--font-geist-sans)] text-[9px] text-white/70">
                Listening
              </span>
            </div>
            <div className="mt-1.5 flex items-end gap-[1px]">
              {[4, 10, 16, 22, 14, 6, 4, 9, 14, 20, 16, 8, 3, 8, 12, 10, 6, 4].map(
                (h, i) => (
                  <span
                    key={i}
                    className="w-[2px] rounded-full bg-white/70"
                    style={{ height: h }}
                  />
                )
              )}
            </div>
          </div>
        </div>
      )}
      {variant === "settings" && (
        <div className="space-y-1 rounded-[10px] bg-[#1C1C1E] p-2">
          {["General", "Control Center", "VoiceClaw", "Privacy & Security"].map(
            (row) => (
              <div
                key={row}
                className="flex items-center justify-between rounded-[6px] bg-white/5 px-2 py-2"
              >
                <span className="font-[family-name:var(--font-geist-sans)] text-[10px] text-white">
                  {row}
                </span>
                <span className="text-white/40">›</span>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

function MacWindowShot({ variant }: { variant: "popover" | "settings" }) {
  if (variant === "popover") {
    return (
      <div className="overflow-hidden rounded-[14px] bg-white/70 ring-1 ring-inset ring-black/10 backdrop-blur-xl">
        <div className="border-b border-black/5 bg-white/70 px-3 py-2">
          <p className="font-[family-name:var(--font-geist-sans)] text-[11px] font-medium text-[#1D1D1F]">
            VoiceClaw
          </p>
          <p className="font-[family-name:var(--font-geist-sans)] text-[10px] text-[#6E6E73]">
            Listening · localhost:8787
          </p>
        </div>
        <div className="p-3">
          <div className="flex items-end gap-[2px] rounded-md bg-[#F2F2F4] p-2">
            {[6, 12, 22, 34, 48, 30, 18, 12, 8, 16, 32, 48, 34, 20, 12, 6, 10, 18].map(
              (h, i) => (
                <span
                  key={i}
                  className="w-[3px] rounded-full bg-[#6E6E73]/70"
                  style={{ height: h }}
                />
              )
            )}
          </div>
          <div className="mt-2 flex items-center justify-between font-[family-name:var(--font-geist-sans)] text-[10px] text-[#6E6E73]">
            <span>182 ms</span>
            <span>gpt-4o via /chat</span>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-[14px] bg-white ring-1 ring-inset ring-black/10">
      <div className="border-b border-black/5 bg-[#F5F5F7] px-3 py-2 font-[family-name:var(--font-geist-sans)] text-[11px] font-medium text-[#1D1D1F]">
        Settings
      </div>
      <div className="p-3">
        <div className="space-y-1">
          {[
            { k: "Endpoint", v: "https://api.openai.com/v1" },
            { k: "API key", v: "sk-•••••••••" },
            { k: "Shortcut", v: "⌘ ⌥ V" },
            { k: "Menu bar", v: "On" },
          ].map((r) => (
            <div
              key={r.k}
              className="flex items-center justify-between rounded-md border-b border-black/5 px-2 py-1.5 last:border-b-0"
            >
              <span className="font-[family-name:var(--font-geist-sans)] text-[11px] text-[#3A3A3C]">
                {r.k}
              </span>
              <span className="font-[family-name:var(--font-jetbrains)] text-[10.5px] text-[#6E6E73]">
                {r.v}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SymMic() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function SymMicSlash() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M4 4l16 16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function SymWaveform() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M3 12h2M7 8v8M11 5v14M15 8v8M19 11v2M21 12h-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function SymLink() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path
        d="M10 14a4 4 0 0 1 0-5.66l2-2a4 4 0 0 1 5.66 5.66l-1 1M14 10a4 4 0 0 1 0 5.66l-2 2a4 4 0 0 1-5.66-5.66l1-1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SymKey() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <circle cx="8.5" cy="12.5" r="3.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 12.5h9M17 12.5v3M20 12.5v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function SymChevron() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="m8 6 6 6-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SymGear() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SymCircle() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function SymDot() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1" />
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  )
}

function SymBattery() {
  return (
    <svg width="28" height="18" viewBox="0 0 36 18" fill="none">
      <rect x="0.5" y="0.5" width="30" height="17" rx="3" stroke="currentColor" strokeWidth="1.4" />
      <rect x="3" y="3" width="22" height="12" rx="1.5" fill="currentColor" />
      <rect x="32" y="5" width="3" height="8" rx="1" fill="currentColor" />
    </svg>
  )
}

function SymPlay() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M8 5v14l11-7z" fill="currentColor" />
    </svg>
  )
}

function SymStop() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
    </svg>
  )
}
