'use client'

import { useState } from 'react'

import { Calculator, Users, Check } from 'lucide-react'

import { Heading, Text } from '@/components/luxury/ui/Typography'

import { Section } from '@/components/luxury/ui/Section'

import { Button } from '@/components/luxury/ui/Button'

import { Locale } from '@/lib/dictionary'

import { pl } from "@/dictionaries/pl"

import { Navbar } from "@/components/luxury/layout/Navbar"

import { FeatureComparison } from '@/components/luxury/sections/FeatureComparison'



type Dictionary = typeof pl



export default function PricingClient({ dict, lang }: { dict: Dictionary, lang: Locale }) {

  const [staffCount, setStaffCount] = useState(3)

  

  // Base price logic: 100 PLN -> 50 PLN (promo)

  // TODO: Currency should depend on lang/locale (PLN vs EUR)

  const basePrice = 50

  const staffPrice = 25

  

  const totalMonthly = basePrice + (staffCount * staffPrice)



  return (

    <main className="bg-[#F9F7F2] min-h-screen">

      <Navbar dict={dict} lang={lang} />

      

      <div className="pt-20">

        <Section variant="ivory">

          <div className="text-center mb-16">

            <span className="inline-block py-1 px-4 border border-[#D4AF37]/40 rounded-full text-[#B38728] text-xs tracking-[0.3em] uppercase mb-6 bg-white/50 backdrop-blur-sm">

              {dict.pricing.promo}

            </span>

            <Heading variant="h1" className="mb-6">{dict.pricing.title}</Heading>

            <Text className="max-w-xl mx-auto text-lg">

              {dict.pricing.subtitle}

            </Text>

          </div>



          <div className="grid md:grid-cols-12 gap-8 max-w-6xl mx-auto mb-24">

             {/* LEFT: The Plans */}

             <div className="md:col-span-7 grid gap-6">

                {/* Starter Plan */}

                <div className="bg-white rounded-3xl p-8 border border-[#F0EBE0] hover:border-[#D4AF37]/30 transition-colors flex flex-col md:flex-row gap-6 items-start">

                    <div className="flex-1">

                        <Heading variant="h3" className="mb-2">{dict.pricing.plans.starter.name}</Heading>

                        <Text className="text-sm mb-4">{dict.pricing.plans.starter.desc}</Text>

                        <div className="flex items-baseline gap-2">

                           <span className="text-3xl font-serif font-bold text-[#1A1A1A]">{dict.pricing.plans.starter.price}</span>

                           <span className="text-[#1A1A1A]/40 line-through text-sm">{dict.pricing.plans.starter.originalPrice}</span>

                           <span className="text-[#1A1A1A]/40 text-xs">{dict.pricing.plans.starter.period}</span>

                        </div>

                    </div>

                    <div className="flex-1 space-y-3">

                        {dict.pricing.plans.starter.features.map((f: string, i: number) => (

                            <div key={i} className="flex items-center gap-2">

                                <Check className="w-4 h-4 text-[#B38728]" />

                                <span className="text-sm text-[#1A1A1A]/70">{f}</span>

                            </div>

                        ))}

                    </div>

                </div>



                {/* Pro Plan */}

                <div className="bg-[#1A1A1A] text-white rounded-3xl p-8 border border-[#D4AF37]/30 relative overflow-hidden flex flex-col md:flex-row gap-6 items-start shadow-xl">

                    <div className="absolute top-0 right-0 bg-[#D4AF37] text-white px-4 py-1 rounded-bl-xl text-[10px] uppercase tracking-widest font-bold">

                        {dict.pricing.plans.pro.badge}

                    </div>

                    

                    <div className="flex-1 relative z-10">

                        <Heading variant="h3" color="white" className="mb-2">{dict.pricing.plans.pro.name}</Heading>

                        <Text color="white" className="text-sm mb-4 opacity-70">{dict.pricing.plans.pro.desc}</Text>

                        <div className="flex flex-col gap-1">

                           <div className="flex items-baseline gap-2">

                               <span className="text-4xl font-serif font-bold text-[#D4AF37]">{dict.pricing.plans.pro.price}</span>

                               <span className="text-white/40 text-xs">{dict.pricing.plans.pro.period}</span>

                           </div>

                           <span className="text-[#D4AF37] text-sm font-medium">{dict.pricing.plans.pro.plus}</span>

                        </div>

                    </div>

                    <div className="flex-1 space-y-3 relative z-10">

                        {dict.pricing.plans.pro.features.map((f: string, i: number) => (

                            <div key={i} className="flex items-center gap-2">

                                <Check className="w-4 h-4 text-[#D4AF37]" />

                                <span className="text-sm text-white/80">{f}</span>

                            </div>

                        ))}

                    </div>

                </div>

             </div>



             {/* RIGHT: Calculator */}

             <div className="md:col-span-5">

                <div className="bg-white rounded-3xl p-8 border border-[#D4AF37]/20 sticky top-24 shadow-[0_20px_60px_rgba(212,175,55,0.1)]">

                   <div className="flex items-center gap-3 mb-6">

                      <div className="w-10 h-10 rounded-full bg-[#F9F7F2] flex items-center justify-center text-[#B38728]">

                          <Calculator className="w-5 h-5" />

                      </div>

                      <Heading variant="h4">Twój Kosztorys</Heading>

                   </div>



                   <div className="space-y-6 mb-8">

                      {/* Base Cost */}

                      <div className="flex justify-between items-center pb-4 border-b border-[#F0EBE0]">

                          <span className="text-[#1A1A1A]/70">{dict.pricing.calculator.base}</span>

                          <span className="font-bold">{basePrice} zł</span>

                      </div>



                      {/* Staff Slider */}

                      <div>

                          <div className="flex justify-between items-center mb-4">

                              <span className="text-[#1A1A1A]/70 flex items-center gap-2">

                                  <Users className="w-4 h-4" /> {dict.pricing.calculator.staff}

                              </span>

                              <span className="font-bold text-[#B38728]">{staffCount} {dict.pricing.calculator.staffUnit}</span>

                          </div>

                          <input 

                             type="range" 

                             min="0" 

                             max="20" 

                             value={staffCount}

                             onChange={(e) => setStaffCount(parseInt(e.target.value))}

                             className="w-full h-2 bg-[#F0EBE0] rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"

                          />

                          <div className="text-right text-xs text-[#1A1A1A]/40 mt-2">

                              {staffCount} x {staffPrice} zł = {staffCount * staffPrice} zł

                          </div>

                      </div>



                      {/* Total */}

                      <div className="pt-4 border-t border-[#F0EBE0]">

                          <div className="flex justify-between items-end">

                              <span className="text-sm uppercase tracking-widest font-medium text-[#1A1A1A]/50">{dict.pricing.calculator.total}</span>

                              <div className="text-right">

                                  <div className="text-4xl font-serif font-bold text-[#1A1A1A]">{totalMonthly} zł</div>

                                  <div className="text-xs text-[#1A1A1A]/40">{dict.pricing.calculator.vat}</div>

                              </div>

                          </div>

                      </div>

                   </div>



                   <Button fullWidth size="lg">

                      {dict.nav.getAccess}

                   </Button>

                   <div className="mt-4 text-center">

                      <span className="text-xs text-[#1A1A1A]/40">Nie wymagamy karty kredytowej. 14 dni za darmo.</span>

                   </div>

                </div>

             </div>

          </div>



          <FeatureComparison 

            data={dict.pricingFeatures} 

            labels={{ 

              starter: dict.pricing.plans.starter.name, 

              pro: dict.pricing.plans.pro.name 

            }} 

          />

        </Section>

      </div>

    </main>

  )

}
