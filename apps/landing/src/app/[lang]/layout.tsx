import type { Metadata } from "next";
import { Locale } from "@/lib/dictionary";

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'pl' }, { lang: 'ru' }, { lang: 'ua' }]
}

export const metadata: Metadata = {
  title: 'Beauty Platform — Calm, Premium Salon Software',
  description: 'All-in-one salon platform for Europe.',
};

export default async function LanguageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = ['en', 'pl', 'ru', 'ua'].includes(lang) ? (lang as Locale) : 'en';

  return (
    <div data-locale={locale} className="min-h-screen">
      {children}
    </div>
  );
}
