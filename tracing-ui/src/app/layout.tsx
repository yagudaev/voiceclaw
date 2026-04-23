import type { Metadata } from "next"
import Link from "next/link"
import "./globals.css"

export const metadata: Metadata = {
  title: "VoiceClaw Tracing",
  description: "Per-session observability for VoiceClaw voice/video conversations",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-zinc-800 px-6 py-3 flex gap-6 items-center">
            <Link href="/" className="font-semibold tracking-tight">
              VoiceClaw Tracing
            </Link>
            <nav className="flex gap-4 text-sm text-zinc-400">
              <Link href="/dashboard" className="hover:text-zinc-100">Dashboard</Link>
              <Link href="/sessions" className="hover:text-zinc-100">Sessions</Link>
              <Link href="/users" className="hover:text-zinc-100">Users</Link>
            </nav>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  )
}
