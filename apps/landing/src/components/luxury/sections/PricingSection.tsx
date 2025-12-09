'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Heading, Text } from '@/components/luxury/ui/Typography'
import { Section } from '@/components/luxury/ui/Section'
import { Button } from '@/components/luxury/ui/Button'
import Link from 'next/link'

interface PricingData {
  title: string
  subtitle: string
  plans: {
    starter: Plan
    pro: Plan
    enterprise: Plan
  }
}

interface Plan {
  name: string
  price: string
  period?: string
  plus?: string
  desc: string
  features: string[]
  badge?: string
  highlight?: boolean
}

export function PricingSection({ pricing, lang }: { pricing: PricingData, lang: string }) {
  const plans = [
    { id: 'starter', ...pricing.plans.starter },
    { id: 'pro', ...pricing.plans.pro, highlight: true },
    { id: 'enterprise', ...pricing.plans.enterprise },
  ]

  return (
    <Section variant="white">
      <div className="text-center mb-20">
        <Heading variant="h2" className="mb-6">{pricing.title}</Heading>
        <Text className="max-w-xl mx-auto">
          {pricing.subtitle}
        </Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {plans.map((plan, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={`rounded-3xl p-10 border relative flex flex-col h-full ${
              plan.highlight 
                ? "bg-[#F9F7F2] border-[#D4AF37] shadow-[0_20px_60px_rgba(212,175,55,0.15)] scale-105 z-10" 
                : "bg-white border-[#F0EBE0] hover:border-[#D4AF37]/30 transition-colors"
            }`}
          >
            {plan.highlight && plan.badge && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#D4AF37] text-white px-4 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold">
                {plan.badge}
              </div>
            )}

            <div className="mb-8">
              <Heading variant="h3" className="mb-2">{plan.name}</Heading>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-serif font-bold text-[#1A1A1A]">{plan.price}</span>
                {plan.period && <span className="text-[#1A1A1A]/40 text-sm">{plan.period}</span>}
              </div>
              {plan.plus && <div className="text-sm text-[#B38728] font-medium mb-2">{plan.plus}</div>}
              <Text variant="small" className="min-h-[40px]">{plan.desc}</Text>
            </div>

            <div className="flex-1 space-y-4 mb-10">
              {plan.features.map((feat, j) => (
                <div key={j} className="flex items-start gap-3">
                  <div className="mt-1 w-4 h-4 rounded-full bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-[#B38728]" />
                  </div>
                  <Text variant="small" color="dark" className="text-sm">{feat}</Text>
                </div>
              ))}
            </div>

            <Link href={`/${lang}/pricing`} className="w-full">
                <Button 
                  variant={plan.highlight ? "primary" : "outline"} 
                  fullWidth
                >
                  {plan.id === "enterprise" ? "Contact Us" : "Start Trial"}
                </Button>
            </Link>
          </motion.div>
        ))}
      </div>
    </Section>
  )
}
