import {
  Mic,
  Key,
  MessageSquare,
  Code2,
  Settings,
  MessagesSquare,
  AudioLines,
} from "lucide-react"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <a href="/" className="text-lg font-semibold tracking-tight">
          VoiceClaw
        </a>
        <nav className="flex items-center gap-4">
          <a
            href="https://github.com/yagudaev/voiceclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  )
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden px-6 py-32 sm:py-40">
      {/* Subtle gradient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Voice interface for any AI
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
          Talk to your AI assistant by voice. Connect to any LLM. Open source.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <a
            href="https://github.com/yagudaev/voiceclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            <GitHubIcon className="size-4" />
            View on GitHub
          </a>
          <a
            href="#features"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-medium transition-colors hover:bg-muted"
          >
            Learn more
          </a>
        </div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  return (
    <section id="features" className="border-t border-border/40 px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need
          </h2>
          <p className="mt-4 text-muted-foreground">
            A complete voice and chat interface for your favourite AI models.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2">
          <FeatureCard
            icon={<Mic className="size-5" />}
            title="Real-time voice conversations"
            description="Have natural, real-time voice conversations with any AI model. Low latency streaming keeps the dialogue flowing."
          />
          <FeatureCard
            icon={<Key className="size-5" />}
            title="Bring Your Own Key"
            description="Connect to OpenAI, Anthropic, Groq, or self-hosted models. Your keys, your data, your choice."
          />
          <FeatureCard
            icon={<MessageSquare className="size-5" />}
            title="Full chat + voice in one app"
            description="Switch seamlessly between text chat and voice. See the full conversation history in both modes."
          />
          <FeatureCard
            icon={<Code2 className="size-5" />}
            title="Open source"
            description="Run it yourself. Inspect the code. Contribute. VoiceClaw is fully open source under the MIT licence."
          />
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  return (
    <section className="border-t border-border/40 px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-muted-foreground">
            Get started in three simple steps.
          </p>
        </div>

        <div className="mt-16 grid gap-10 sm:grid-cols-3">
          <StepCard
            step={1}
            icon={<Settings className="size-5" />}
            title="Configure your API"
            description="Add your API key for OpenAI, Anthropic, Groq, or any compatible provider."
          />
          <StepCard
            step={2}
            icon={<MessagesSquare className="size-5" />}
            title="Start a conversation"
            description="Create a new conversation and choose your model. Text or voice -- it is up to you."
          />
          <StepCard
            step={3}
            icon={<AudioLines className="size-5" />}
            title="Talk naturally"
            description="Press the mic button and speak. VoiceClaw handles transcription, inference, and speech synthesis."
          />
        </div>
      </div>
    </section>
  )
}

function CTASection() {
  return (
    <section className="border-t border-border/40 px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Open source and free
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          VoiceClaw is open source. Star the repo, open an issue, or contribute
          a pull request.
        </p>
        <div className="mt-8">
          <a
            href="https://github.com/yagudaev/voiceclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            <GitHubIcon className="size-4" />
            GitHub
          </a>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-border/40 px-6 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
        <p>
          Built by{" "}
          <a
            href="https://github.com/yagudaev"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground transition-colors hover:text-primary"
          >
            Michael Yagudaev
          </a>
        </p>
        <a
          href="https://github.com/yagudaev/voiceclaw"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 transition-colors hover:text-foreground"
        >
          <GitHubIcon className="size-4" />
          GitHub
        </a>
      </div>
    </footer>
  )
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/50 p-6 transition-colors hover:bg-card">
      <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: number
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Step {step}
      </span>
      <h3 className="mt-2 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  )
}
