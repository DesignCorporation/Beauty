'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus } from 'lucide-react'
import { Heading, Text } from '@/components/luxury/ui/Typography'
import { Section } from '@/components/luxury/ui/Section'

interface FaqData {
  title: string
  subtitle: string
  contact: string
  items: {
    q: string
    a: string
  }[]
}

export function FaqSection({ faq }: { faq: FaqData }) {
  return (
    <Section variant="ivory" id="faq">
      <div className="grid md:grid-cols-12 gap-12">
        <div className="md:col-span-4">
          <Heading variant="h2" className="mb-6">{faq.title}</Heading>
          <Text className="mb-8">
            {faq.subtitle}
          </Text>
          <Text variant="small" className="font-medium underline decoration-[#D4AF37] underline-offset-4 cursor-pointer hover:text-[#B38728] transition-colors w-fit">
            {faq.contact}
          </Text>
        </div>

        <div className="md:col-span-8 space-y-4">
          {faq.items.map((item, i) => (
            <FaqItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>
      </div>
    </Section>
  )
}

function FaqItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-[#1A1A1A]/10">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between text-left group"
      >
        <Heading variant="h4" className="text-xl group-hover:text-[#B38728] transition-colors">
          {question}
        </Heading>
        <div className={`w-8 h-8 rounded-full border border-[#1A1A1A]/10 flex items-center justify-center transition-colors ${isOpen ? 'bg-[#1A1A1A] text-white' : 'group-hover:border-[#D4AF37]'}`}>
          {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Text className="pb-8 pr-8 text-[#1A1A1A]/70">
              {answer}
            </Text>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
