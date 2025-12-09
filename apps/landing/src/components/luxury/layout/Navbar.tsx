'use client'

import Link from 'next/link'
import { Locale } from '@/lib/dictionary'
import { pl } from "@/dictionaries/pl"

type Dictionary = typeof pl

interface NavbarProps {
  dict: Dictionary
  lang: Locale
}

export function Navbar({ dict, lang }: NavbarProps) {
  return (
    <nav className="fixed top-0 w-full z-50 px-6 py-6 flex justify-between items-center text-[#1A1A1A]">
      <div className="absolute inset-0 bg-[#F9F7F2]/80 backdrop-blur-md border-b border-[#D4AF37]/10" />
      <Link href={`/${lang}`} className="relative z-10 text-2xl font-serif font-bold tracking-tighter hover:opacity-80 transition-opacity">
        BEAUTY.
      </Link>
      
      {/* Desktop Menu */}
      <div className="relative z-10 hidden md:flex gap-8 font-medium text-sm tracking-widest uppercase text-[#1A1A1A]/70">
        <Link href={`/${lang}#features`} className="hover:text-[#B38728] transition-colors">{dict.nav.features}</Link>
        <Link href={`/${lang}/pricing`} className="hover:text-[#B38728] transition-colors">{dict.nav.pricing}</Link>
        <Link href="#" className="hover:text-[#B38728] transition-colors">{dict.nav.stories}</Link>
      </div>

      {/* Actions & Lang Switcher */}
      <div className="relative z-10 flex items-center gap-4">
         <div className="hidden md:flex gap-2 text-xs font-medium uppercase tracking-widest text-[#1A1A1A]/50">
            <Link href="/pl" className={lang === 'pl' ? 'text-[#D4AF37]' : 'hover:text-[#1A1A1A]'}>PL</Link>
            <span className="opacity-30">/</span>
            <Link href="/en" className={lang === 'en' ? 'text-[#D4AF37]' : 'hover:text-[#1A1A1A]'}>EN</Link>
            <span className="opacity-30">/</span>
            <Link href="/ua" className={lang === 'ua' ? 'text-[#D4AF37]' : 'hover:text-[#1A1A1A]'}>UA</Link>
            <span className="opacity-30">/</span>
            <Link href="/ru" className={lang === 'ru' ? 'text-[#D4AF37]' : 'hover:text-[#1A1A1A]'}>RU</Link>
         </div>
         <button className="border border-[#1A1A1A]/10 px-6 py-2 rounded-full text-sm uppercase tracking-wide hover:bg-[#1A1A1A] hover:text-white transition-all duration-300">
          {dict.nav.getAccess}
         </button>
      </div>
    </nav>
  )
}
