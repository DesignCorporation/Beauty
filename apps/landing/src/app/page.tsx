import { headers } from "next/headers";
import { redirect } from "next/navigation";

const SUPPORTED_LOCALES = ["en", "pl", "ru", "ua"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const DEFAULT_LOCALE: SupportedLocale = "en";

async function resolvePreferredLocale(): Promise<SupportedLocale> {
  const headerList = await headers();
  const acceptLanguage = headerList.get("accept-language");

  if (acceptLanguage) {
    const preferred = acceptLanguage
      .split(",")
      .map((entry: string) => entry.trim().split(";")[0])
      .map((locale: string) => locale.toLowerCase());

    for (const locale of preferred) {
      const short = locale.split("-")[0] as SupportedLocale;
      if (SUPPORTED_LOCALES.includes(short)) {
        return short;
      }
    }
  }

  return DEFAULT_LOCALE;
}

export default async function RootRedirectPage() {
  const locale = await resolvePreferredLocale();
  redirect(`/${locale}`);
}
