import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage } from "@/components/legal/LegalPage"

export const metadata: Metadata = {
  title: "Legal · VoiceClaw",
  description: "Privacy Policy, Terms of Service, and other legal documents for VoiceClaw.",
}

export default function LegalIndexPage() {
  return (
    <LegalPage
      title="Legal"
      lastUpdated="April 24, 2026"
      lede="Everything legally binding about using VoiceClaw, in one place."
    >
      <ul>
        <li>
          <Link href="/privacy">Privacy Policy</Link> — what we collect, what we don&apos;t,
          how we handle your data
        </li>
        <li>
          <Link href="/terms">Terms of Service</Link> — the agreement between you and
          Nano 3 Labs Ltd.
        </li>
      </ul>

      <p>
        VoiceClaw itself (the apps, the client libraries, the relay server) is
        open source under the{" "}
        <a href="https://github.com/yagudaev/voiceclaw/blob/main/LICENSE">
          MIT license
        </a>
        . Those terms cover the code; the documents linked above cover our
        hosted services (the website, sign-in, support).
      </p>

      <p>
        Need something we haven&apos;t published (DPA, subprocessor list, security
        questionnaire)? Email{" "}
        <a href="mailto:support@getvoiceclaw.com">support@getvoiceclaw.com</a>{" "}
        and we&apos;ll put it together.
      </p>
    </LegalPage>
  )
}
