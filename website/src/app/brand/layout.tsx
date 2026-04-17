import { BrandSidebar } from "@/components/brand/BrandSidebar"
import { Geist, Geist_Mono, Fraunces, JetBrains_Mono } from "next/font/google"

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
})

export default function BrandLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className={`${fraunces.variable} ${jetbrainsMono.variable} flex min-h-screen`}
    >
      <BrandSidebar />
      <main className="flex-1 overflow-x-hidden md:pl-64">{children}</main>
    </div>
  )
}
