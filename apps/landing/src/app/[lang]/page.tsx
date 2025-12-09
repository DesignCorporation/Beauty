import { getDictionary, Locale } from "@/lib/dictionary"
import LandingClient from "./LandingClient" // Client wrapper for interactivity if needed

export default async function Page({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params
  const dict = await getDictionary(lang)

  return (
    <LandingClient dict={dict} lang={lang} />
  )
}
