'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { MessageCircle, TrendingUp, CheckCircle2 } from 'lucide-react'
import { Heading, Text } from '@/components/luxury/ui/Typography'
import { Section } from '@/components/luxury/ui/Section'

interface DeepDiveData {
  calendar: { title: string, desc: string }
  messaging: { title: string, desc: string, bullets: string[] }
  analytics: { title: string, desc: string, bullets: string[] }
}

export function DeepDiveSection({ data }: { data: DeepDiveData }) {
  return (
    <Section variant="white" className="!py-0">
      {/* Block 1: Calendar (Image Right) */}
      <div className="grid md:grid-cols-2 items-center gap-12 py-24">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="order-2 md:order-1"
        >
           <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border border-[#1A1A1A]/5 group">
              {/* Calendar Image */}
              <Image 
                src="/images/calendar-ui.jpg" 
                alt="Calendar UI" 
                fill 
                className="object-cover object-top group-hover:scale-105 transition-transform duration-700"
              />
              {/* Overlay gradient for luxury feel */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/10 to-transparent" />
           </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="order-1 md:order-2"
        >
          <Heading variant="h2" className="mb-6">{data.calendar.title}</Heading>
          <Text className="text-lg">{data.calendar.desc}</Text>
        </motion.div>
      </div>

      {/* Block 2: Messaging (Icon/Visual Left) */}
      <div className="grid md:grid-cols-2 items-center gap-12 py-24 border-t border-[#1A1A1A]/5">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <Heading variant="h2" className="mb-6">{data.messaging.title}</Heading>
          <Text className="text-lg mb-8">{data.messaging.desc}</Text>
          <ul className="space-y-4">
            {data.messaging.bullets.map((bullet, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-[#B38728]" />
                </div>
                <Text>{bullet}</Text>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="bg-[#F9F7F2] rounded-3xl p-12 border border-[#F0EBE0] relative overflow-hidden min-h-[400px] flex items-center justify-center"
        >
           {/* Abstract visual for Messaging */}
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-50 mix-blend-multiply" />
           <div className="relative z-10 text-center">
              <div className="w-24 h-24 bg-white rounded-full shadow-xl flex items-center justify-center mx-auto mb-6 animate-pulse">
                 <MessageCircle className="w-10 h-10 text-[#D4AF37]" />
              </div>
              <div className="space-y-3">
                 <div className="bg-white px-6 py-3 rounded-l-xl rounded-tr-xl shadow-sm text-sm text-left text-[#1A1A1A]/70 max-w-[200px] -ml-8">
                    Confirm appointment?
                 </div>
                 <div className="bg-[#D4AF37] px-6 py-3 rounded-l-xl rounded-br-xl shadow-sm text-sm text-white text-right max-w-[200px] ml-8">
                    Yes, see you! ✨
                 </div>
              </div>
           </div>
        </motion.div>
      </div>

      {/* Block 3: Analytics (Visual Right) */}
      <div className="grid md:grid-cols-2 items-center gap-12 py-24 border-t border-[#1A1A1A]/5">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
           className="bg-[#1A1A1A] text-white rounded-3xl p-12 border border-[#D4AF37]/30 relative overflow-hidden min-h-[400px] flex flex-col justify-end order-2 md:order-1"
        >
           {/* Abstract Chart Visual */}
           <div className="flex items-end justify-between gap-2 h-48 relative z-10">
              {[40, 65, 50, 85, 60, 95].map((h, i) => (
                <div key={i} className="w-full bg-gradient-to-t from-[#B38728] to-[#D4AF37] rounded-t-md opacity-80 relative group">
                   <div style={{ height: `${h}%`}} className="w-full absolute bottom-0 rounded-t-md transition-all duration-1000" />
                   <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-[#D4AF37]">
                      {h}%
                   </div>
                </div>
              ))}
           </div>
           <div className="mt-8 flex items-center gap-4 border-t border-white/10 pt-6">
              <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                 <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                 <div className="text-xs text-white/50 uppercase tracking-widest">Revenue Growth</div>
                 <div className="text-2xl font-serif font-bold text-[#F4E097]">+32%</div>
              </div>
           </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="order-1 md:order-2"
        >
          <Heading variant="h2" className="mb-6">{data.analytics.title}</Heading>
          <Text className="text-lg mb-8">{data.analytics.desc}</Text>
          <ul className="space-y-4">
            {data.analytics.bullets.map((bullet, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#1A1A1A]/5 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-[#1A1A1A]" />
                </div>
                <Text>{bullet}</Text>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </Section>
  )
}
