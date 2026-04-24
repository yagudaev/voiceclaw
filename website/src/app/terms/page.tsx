import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/LegalPage"

export const metadata: Metadata = {
  title: "Terms of Service · VoiceClaw",
  description:
    "The agreement between you and Nano 3 Labs Ltd. covering VoiceClaw — what you're allowed to do, what we promise, and what we don't.",
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated="April 24, 2026"
      lede="These terms cover your use of VoiceClaw and its related services. VoiceClaw is open-source software and a small set of hosted services operated by Nano 3 Labs Ltd. Most of the product runs on your own machine; these terms mainly describe the parts that don't."
    >
      <h2>Agreement</h2>
      <p>
        By using VoiceClaw (the apps, the website at{" "}
        <code>getvoiceclaw.com</code>, and any related services we operate),
        you agree to these terms. If you don&apos;t agree, please don&apos;t use
        VoiceClaw.
      </p>
      <p>
        VoiceClaw is operated by <strong>Nano 3 Labs Ltd.</strong>, a Canadian
        company. References to &ldquo;we,&rdquo; &ldquo;us,&rdquo; and &ldquo;our&rdquo; mean Nano 3 Labs Ltd.
      </p>

      <h2>What VoiceClaw does</h2>
      <p>
        VoiceClaw is a voice interface for AI agents. The desktop and mobile
        apps run on your devices, connect to a voice model you configure
        (Google Gemini, OpenAI, xAI, or a compatible endpoint), and route the
        AI&apos;s tool calls to a &ldquo;brain&rdquo; agent you also configure (bundled
        OpenClaw, Claude Code, Codex CLI, or any OpenAI-compatible endpoint).
      </p>
      <p>
        The app source code is open source under the MIT license. These terms
        only govern the services we operate (the website, sign-in, support).
        The software itself is yours to run, modify, and fork under the MIT
        license.
      </p>

      <h2>Your account</h2>
      <p>
        Signing in is optional. If you do sign in, you&apos;re responsible for
        keeping your Google or Apple account secure, and for any activity that
        happens through your signed-in VoiceClaw account. Tell us at{" "}
        <a href="mailto:support@getvoiceclaw.com">support@getvoiceclaw.com</a>{" "}
        if you believe your account has been compromised.
      </p>
      <p>
        You must be at least 13 years old to use VoiceClaw, and at least the
        age of majority in your jurisdiction to enter into this agreement.
      </p>

      <h2>What you can&apos;t do</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use VoiceClaw for anything illegal under applicable law</li>
        <li>
          Use VoiceClaw to harass, abuse, harm, threaten, or impersonate
          another person
        </li>
        <li>
          Use VoiceClaw to generate or distribute sexually explicit content
          involving minors, non-consensual intimate imagery, or content
          designed to incite violence
        </li>
        <li>
          Attempt to reverse-engineer, disable, or interfere with our hosted
          services (the website, sign-in flow, update feed)
        </li>
        <li>
          Resell VoiceClaw as a hosted service without our written permission
          (the open-source license still lets you run it yourself)
        </li>
        <li>
          Circumvent rate limits or other technical controls on our hosted
          services
        </li>
      </ul>

      <h2>AI-generated content</h2>
      <p>
        VoiceClaw is a frontend for AI providers you configure. The words the
        AI says back to you come from that provider, run under their content
        policies, not ours. Google, OpenAI, and xAI each have their own
        acceptable-use rules that apply to what you can ask and what they&apos;ll
        generate. You&apos;re responsible for complying with those rules in
        addition to these terms.
      </p>
      <p>
        AI systems sometimes generate inaccurate, biased, or offensive content.
        Don&apos;t treat AI output as professional advice (medical, legal,
        financial, etc.) and verify anything that matters.
      </p>
      <p>
        <strong>Reporting objectionable content.</strong> If VoiceClaw (through
        a configured provider) generates content you find objectionable, you
        can report it to us at{" "}
        <a href="mailto:support@getvoiceclaw.com">support@getvoiceclaw.com</a>.
        We have zero tolerance for content that violates these terms, and we
        can terminate access for users who repeatedly generate such content
        through our hosted services.
      </p>

      <h2>Your content and data</h2>
      <p>
        VoiceClaw is architected so that your content (audio, transcripts,
        files you share with the AI) stays on your device or goes directly to
        the AI provider you configured. We don&apos;t receive your content. For
        more detail see our{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>
      <p>
        To the extent we <em>do</em> hold data about you (your account, analytics
        events, crash reports), you own it and can ask us to export or delete
        it at any time.
      </p>

      <h2>Third-party services</h2>
      <p>
        VoiceClaw relies on external providers you bring (OAuth, AI providers,
        your own brain endpoint). Those services have their own terms and
        privacy policies. When you use Google to sign in, for example, you&apos;re
        also bound by Google&apos;s terms. We&apos;re not responsible for the conduct
        of those third parties.
      </p>

      <h2>Fees</h2>
      <p>
        VoiceClaw is free to use today. You pay the AI providers you
        configure directly (Gemini, OpenAI, xAI). We may introduce paid tiers
        (&ldquo;VoiceClaw Cloud&rdquo;) in the future; if we do, we&apos;ll announce the pricing
        clearly before you sign up for a paid feature, and you&apos;ll have the
        chance to opt in or not.
      </p>

      <h2>Termination</h2>
      <p>
        You can stop using VoiceClaw at any time. You can delete your account
        by emailing{" "}
        <a href="mailto:support@getvoiceclaw.com">support@getvoiceclaw.com</a>.
        We&apos;ll fully delete it within 30 days.
      </p>
      <p>
        We can suspend or terminate your account if you materially violate
        these terms, especially around prohibited content or attempts to
        compromise our services. Where practical we&apos;ll give you notice and a
        chance to remedy the issue first.
      </p>

      <h2>Changes to the service</h2>
      <p>
        We&apos;re shipping this actively. Features may change, new ones land, old
        ones get retired. We&apos;ll do our best to give reasonable notice of
        breaking changes to our hosted services. The open-source client code
        is yours — nothing we do can take away your ability to keep running a
        version you cloned.
      </p>

      <h2>Disclaimer of warranties</h2>
      <p>
        VoiceClaw is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; We make no
        warranties — express, implied, statutory, or otherwise — about the
        service, including any warranty of merchantability, fitness for a
        particular purpose, or non-infringement. Voice AI is a fast-moving
        space and we can&apos;t guarantee the service will always work or work
        correctly.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Nano 3 Labs Ltd. is not liable
        for indirect, incidental, consequential, special, exemplary, or
        punitive damages arising out of your use of VoiceClaw. Our total
        liability for any claim relating to VoiceClaw is limited to the greater
        of (a) the fees you&apos;ve paid us in the 12 months preceding the claim
        or (b) CAD $100.
      </p>

      <h2>Indemnification</h2>
      <p>
        If a third party sues us because of something you did with VoiceClaw
        (e.g., using it in violation of these terms, misusing AI-generated
        content), you&apos;ll defend us against that claim and cover the
        reasonable costs, including legal fees.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of the Province of British
        Columbia and the federal laws of Canada, without regard to conflict of
        laws principles. Any dispute that can&apos;t be resolved informally will be
        handled in the courts of British Columbia.
      </p>

      <h2>General</h2>
      <p>
        If any provision of these terms is found unenforceable, the rest stay
        in effect. Our failure to enforce a provision isn&apos;t a waiver of our
        right to enforce it later. You can&apos;t assign these terms without our
        written consent. We can assign them to a successor entity (e.g., if
        the company is acquired).
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Email{" "}
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
