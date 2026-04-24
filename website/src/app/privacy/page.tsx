import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/LegalPage"

export const metadata: Metadata = {
  title: "Privacy Policy · VoiceClaw",
  description:
    "What VoiceClaw collects, what it doesn't, and how your voice and keys stay on your own machine.",
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="April 24, 2026"
      lede="VoiceClaw is a voice layer that lives on your own Mac and phone. Your audio, transcripts, and provider API keys stay on your devices — we never receive them. This page describes the narrow slice of data we do collect, why, and what we promise not to do with it."
    >
      {/*
        Telemetry note: error tracking is handled by PostHog's built-in
        captureException + session replay (same SDK as analytics). The
        previous separate "Sentry for crash reports" line is gone — one
        vendor, one opt-out switch.
      */}
      <h2>The short version</h2>
      <ul>
        <li>
          <strong>We store:</strong> your email and name (if you sign in), a
          hashed device token so you stay signed in, and anonymous analytics
          about which onboarding steps you finished.
        </li>
        <li>
          <strong>We don&apos;t receive:</strong> your voice, your transcripts, your
          conversations, your API keys, or any contents of your AI sessions.
          Those stay on your Mac and phone, or go directly from your device to
          the AI provider you configured.
        </li>
        <li>
          <strong>We use:</strong> Vercel to host this website, Neon (Postgres) to
          store your account, and PostHog for anonymous product analytics,
          error tracking, and session replays (with all input fields
          masked).
        </li>
        <li>
          <strong>You can:</strong> delete your account, export your data, or opt
          out of analytics at any time.
        </li>
      </ul>

      <h2>Who we are</h2>
      <p>
        VoiceClaw is built and operated by <strong>Nano 3 Labs Ltd.</strong>, a
        Canadian company registered at 400 – 1168 Hamilton St, Vancouver,
        British Columbia V6B 2S2, Canada. References to &ldquo;we,&rdquo; &ldquo;us,&rdquo; and &ldquo;our&rdquo;
        in this policy mean Nano 3 Labs Ltd.
      </p>

      <h2>What we collect</h2>

      <h3>Account information</h3>
      <p>
        When you sign in with Google or Apple, we receive and store:
      </p>
      <ul>
        <li>Your email address</li>
        <li>Your name (as provided by Google/Apple)</li>
        <li>
          A stable identifier from Google/Apple (the OAuth <code>sub</code>) so we
          can recognize you across sign-ins
        </li>
      </ul>
      <p>
        We do not receive your password. OAuth handles that end-to-end with
        Google or Apple.
      </p>

      <h3>Device tokens</h3>
      <p>
        After you sign in, we issue a long-lived token that lets your desktop or
        mobile app stay authenticated. The token itself lives in your device&apos;s
        keychain. We store only a <em>hash</em> of the token (we cannot recover the
        original from the hash).
      </p>

      <h3>Analytics, error tracking, and session replay</h3>
      <p>
        We use <a href="https://posthog.com">PostHog</a> for three things:
      </p>
      <ul>
        <li>
          <strong>Anonymous product analytics</strong> — which onboarding
          steps you completed, which provider and brain you selected, how
          long a step took, whether the test call succeeded.
        </li>
        <li>
          <strong>Error tracking</strong> — uncaught exceptions, unhandled
          promise rejections, and renderer crashes, with stack traces and
          some system metadata (OS version, app version). Stack traces can
          include file paths and variable names but not the contents of
          your conversations.
        </li>
        <li>
          <strong>Session replays of the website only</strong> — a recording
          of clicks and DOM events on{" "}
          <code>getvoiceclaw.com</code> so we can debug UI bugs. All input
          fields are masked: your typing is never recorded. Session replays
          do <em>not</em> run inside the desktop or mobile apps.
        </li>
      </ul>
      <p>
        Events include a random device ID but are not linked to your
        identity. We do not send the contents of your conversations, any
        audio, or any provider API keys.
      </p>
      <p>
        You can turn telemetry off in Settings → Privacy at any time. The
        toggle covers analytics, error tracking, and session replay
        together.
      </p>

      <h2>What we do not receive</h2>
      <p>
        VoiceClaw is specifically designed so that your sensitive data never
        leaves your machine or goes to us. In particular, we do not receive:
      </p>
      <ul>
        <li>
          <strong>Your voice.</strong> Audio streams directly from your device to
          the AI provider you chose (Google Gemini, OpenAI, xAI, or your own
          endpoint). It does not pass through our servers.
        </li>
        <li>
          <strong>Your transcripts.</strong> Transcripts are stored locally in
          SQLite on your Mac and phone. You can optionally forward them to your
          own Langfuse instance for observability, but we never receive them.
        </li>
        <li>
          <strong>Your provider API keys.</strong> Your Gemini/OpenAI/xAI key is
          stored in your macOS Keychain (or iOS Keychain on mobile) and used to
          authenticate directly with the provider. We never see it.
        </li>
        <li>
          <strong>Your AI conversations.</strong> What you ask the AI and what it
          says back is between you and the provider you picked.
        </li>
      </ul>

      <h2>Third-party services we use</h2>
      <ul>
        <li>
          <strong>Vercel</strong> — hosts <code>getvoiceclaw.com</code>. Servers
          are in the United States. Vercel may log request metadata (IP
          address, user agent) for abuse prevention.
        </li>
        <li>
          <strong>Neon (managed Postgres)</strong> — stores our user database. We
          use an instance provisioned through our Vercel account. Servers are
          in the United States.
        </li>
        <li>
          <strong>PostHog</strong> — anonymous product analytics, error
          tracking, and (website only) session replay with input masking,
          as described above. Opt-out in Settings.
        </li>
        <li>
          <strong>Google / Apple</strong> — OAuth providers for sign-in. They
          see that you signed in to VoiceClaw but we don&apos;t tell them anything
          else about your usage.
        </li>
        <li>
          <strong>AI providers you configure</strong> — Google Gemini, OpenAI,
          xAI, or a custom endpoint you specify. Their privacy policies
          govern what happens to your audio and conversations once they
          leave your device. We encourage you to read them.
        </li>
      </ul>

      <h2>How long we keep your data</h2>
      <p>
        Account data persists as long as your account is active. If you delete
        your account, we permanently delete your user record, device tokens,
        and authentication tickets within 30 days. Analytics events are
        retained for 180 days and then deleted or anonymized.
      </p>

      <h2>International transfers</h2>
      <p>
        Our servers (Vercel, Neon, PostHog) are located in the United
        States. If you access VoiceClaw from outside the US, your account data
        is transferred to and stored in the US. For users in the EU / EEA, we
        rely on Standard Contractual Clauses with our processors as the legal
        basis for transfer.
      </p>

      <h2>Your rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Access the data we hold about you</li>
        <li>Correct inaccurate data</li>
        <li>Delete your account and all associated data</li>
        <li>Export your account data in a portable format</li>
        <li>Opt out of analytics</li>
        <li>Object to processing on legitimate-interest grounds</li>
      </ul>
      <p>
        To exercise any of these rights, email us at{" "}
        <a href="mailto:support@getvoiceclaw.com">support@getvoiceclaw.com</a>{" "}
        and we&apos;ll respond within 30 days. We may ask you to prove you&apos;re the
        account holder before we act on the request.
      </p>

      <h2>California residents (CCPA)</h2>
      <p>
        Under the California Consumer Privacy Act, California residents have
        additional rights, including the right to know the categories of
        personal information we collect and the right not to be discriminated
        against for exercising privacy rights. The categories we collect are
        described above under &ldquo;What we collect.&rdquo; We do not sell personal
        information.
      </p>

      <h2>EU / EEA residents (GDPR)</h2>
      <p>
        If you&apos;re in the EU / EEA, Nano 3 Labs Ltd. is the data controller for
        your account data. Our legal bases for processing are: performance of
        the contract (account features), our legitimate interest (analytics,
        security), and your consent (optional analytics). You can lodge a
        complaint with your local supervisory authority.
      </p>

      <h2>Children</h2>
      <p>
        VoiceClaw is not directed at children under 13, and we do not knowingly
        collect personal information from anyone under 13. If you believe a
        child has given us personal information, contact us and we&apos;ll delete
        it.
      </p>

      <h2>Security</h2>
      <p>
        We use industry-standard encryption in transit (TLS 1.2+) and at rest
        for our Postgres database. Device tokens are hashed server-side and the
        original never persists. Our design philosophy is to keep sensitive
        data off our servers entirely — we protect best what we never receive.
        That said, no system is perfectly secure, and we can&apos;t guarantee
        absolute security against all threats.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If we make material changes to this policy, we&apos;ll update the &ldquo;Last
        updated&rdquo; date at the top and notify signed-in users by email. Continued
        use of VoiceClaw after a change means you accept the updated policy.
      </p>

      <h2>Contact us</h2>
      <p>
        For privacy questions or to exercise your rights, email{" "}
        <a href="mailto:support@getvoiceclaw.com">support@getvoiceclaw.com</a>.
      </p>
      <p>
        <strong>Nano 3 Labs Ltd.</strong>
        <br />
        400 – 1168 Hamilton St
        <br />
        Vancouver, BC V6B 2S2
        <br />
        Canada
      </p>
    </LegalPage>
  )
}
