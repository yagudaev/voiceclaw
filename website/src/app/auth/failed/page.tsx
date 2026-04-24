import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign-in failed · VoiceClaw",
}

// Landing page when the OAuth flow fails. Minimal by design — the
// user is already frustrated and doesn't need a beautifully styled
// error page. Include a clear next step and a way to tell us.

type Props = {
  searchParams: Promise<{ reason?: string }>
}

export default async function AuthFailedPage({ searchParams }: Props) {
  const { reason } = await searchParams
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Sign-in didn&apos;t work</h1>
      <p className="mt-4 text-muted-foreground">
        Something went wrong while signing you in. Close this page and try again from
        VoiceClaw.
      </p>
      {reason ? (
        <p className="mt-6 rounded-lg border border-border/40 bg-card/40 p-4 text-left font-mono text-xs text-muted-foreground">
          reason: {reason}
        </p>
      ) : null}
      <p className="mt-8 text-sm text-muted-foreground">
        Still broken? Email{" "}
        <a href="mailto:support@getvoiceclaw.com" className="underline">
          support@getvoiceclaw.com
        </a>{" "}
        with the reason code.
      </p>
    </div>
  )
}
