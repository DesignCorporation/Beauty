'use client'
import { HeroSection } from "@/components/luxury/sections/HeroSection"
import { DeepDiveSection } from "@/components/luxury/sections/DeepDiveSection"
import { FeaturesSection } from "@/components/luxury/sections/FeaturesSection"
import { PricingSection } from "@/components/luxury/sections/PricingSection"
import { FaqSection } from "@/components/luxury/sections/FaqSection"
import { Section } from "@/components/luxury/ui/Section"
import { Heading, Text } from "@/components/luxury/ui/Typography"
import { Locale } from "@/lib/dictionary"
import { pl } from "@/dictionaries/pl"
import { Navbar } from "@/components/luxury/layout/Navbar"

type Dictionary = typeof pl

export default function LandingClient({ dict, lang }: { dict: Dictionary, lang: Locale }) {
  return (
    <main className="bg-[#F9F7F2] min-h-screen">
      <Navbar dict={dict} lang={lang} />

      <HeroSection 
        eyebrow={dict.hero.eyebrow}
        title={dict.hero.title}
        subtitle={dict.hero.subtitle}
        cta={dict.hero.cta}
      />

      <DeepDiveSection data={dict.deepDive} />

      <FeaturesSection features={dict.features} /> 
      
      <PricingSection pricing={dict.pricing} lang={lang} />

      <Section variant="ivory">
         <div className="grid md:grid-cols-2 gap-16 items-center">
             <div>
                 <Heading variant="h2" className="mb-6">{dict.founders.title}</Heading>
                 <Text className="mb-6 italic text-lg font-serif text-[#1A1A1A]/80">
                     &quot;{dict.founders.quote}&quot;
                 </Text>
                 <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-[#D4AF37]/20 rounded-full" />
                     <div>
                         <Text variant="small" className="font-bold text-[#1A1A1A]">{dict.founders.author}</Text>
                         <Text variant="label" className="text-[#1A1A1A]/50">{dict.founders.role}</Text>
                     </div>
                 </div>
             </div>
             <div className="h-[400px] bg-[#E5DFD0] rounded-2xl overflow-hidden relative">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600948836101-f9ffda59d250?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-80" />
             </div>
         </div>
      </Section>

      <FaqSection faq={dict.faq} />
      
      {/* Footer needs refactoring too */}
      <footer className="bg-[#1A1A1A] text-white py-20 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
              <div>
                  <div className="text-2xl font-serif font-bold tracking-tighter mb-6">BEAUTY.</div>
              </div>
              <div className="text-white/50 text-sm">
                  © 2025 Beauty Design Corp.
              </div>
          </div>
      </footer>
    </main>
  )
}
