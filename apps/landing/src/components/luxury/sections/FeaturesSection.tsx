'use client'

import { motion } from 'framer-motion'
import { Sparkles, Shield, Clock, BarChart3 } from 'lucide-react'
import { Heading, Text } from '@/components/luxury/ui/Typography'
import { Section } from '@/components/luxury/ui/Section'

interface FeaturesData {
  title: string
  items: {
    ai: { title: string, desc: string }
    financials: { title: string, desc: string }
    vault: { title: string, desc: string }
    waitlist: { title: string, desc: string }
  }
}

export function FeaturesSection({ features }: { features: FeaturesData }) {
  const items = [
    {
      id: 'ai',
      icon: Sparkles,
      className: "md:col-span-2 md:row-span-1 bg-white",
    },
    {
      id: 'financials',
      icon: BarChart3,
      className: "md:col-span-1 md:row-span-2 bg-[#F5F0E6] border-[#E5DFD0]",
    },
    {
      id: 'vault',
      icon: Shield,
      className: "md:col-span-1 bg-white",
    },
    {
      id: 'waitlist',
      icon: Clock,
      className: "md:col-span-1 bg-white",
    },
  ]

  return (
    <Section variant="ivory" id="features">
      <div className="text-center mb-20">
        <Heading variant="h2" className="mb-6">{features.title}</Heading>
        <div className="w-px h-16 bg-[#D4AF37] mx-auto opacity-40" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map((item, i) => {
            // @ts-expect-error - dynamic access based on ID
            const content = features.items[item.id]
            if (!content) return null

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`rounded-3xl p-8 border border-[#F0EBE0] relative overflow-hidden group hover:border-[#D4AF37]/30 hover:shadow-[0_20px_60px_rgba(212,175,55,0.1)] transition-all duration-500 flex flex-col ${item.className}`}
              >
                <div className="mb-6">
                  <div className="w-14 h-14 rounded-full bg-[#F9F7F2] flex items-center justify-center border border-[#F0EBE0] group-hover:scale-110 transition-transform duration-500">
                    <item.icon className="w-6 h-6 text-[#B38728]" />
                  </div>
                </div>
                
                <div>
                  <Heading variant="h3" className="mb-3 text-2xl">{content.title}</Heading>
                  <Text className="text-sm">{content.desc}</Text>
                </div>

                {/* Decorative background element */}
                <div className="absolute -bottom-10 -right-10 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                  <item.icon className="w-40 h-40 text-[#D4AF37]" />
                </div>
              </motion.div>
            )
        })}
      </div>
    </Section>
  )
}
