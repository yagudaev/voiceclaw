import { redirect } from "next/navigation"

// Dashboard is the default landing page per user feedback #7 — Sessions is
// one click away in the top nav. Previously `/` redirected to `/sessions`,
// which meant the Dashboard was never the first impression.
export default function Home() {
  redirect("/dashboard")
}
