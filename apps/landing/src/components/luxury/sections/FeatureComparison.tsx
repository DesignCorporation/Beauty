'use client'

import { Check, Minus, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Heading } from '@/components/luxury/ui/Typography'
import { motion, AnimatePresence } from 'framer-motion'

interface FeatureItem {
  name: string
  starter: boolean | string
  pro: boolean | string
}

interface FeatureCategory {
  name: string
  items: FeatureItem[]
}

interface FeatureComparisonProps {
  data: {
    title: string
    categories: FeatureCategory[]
  }
  labels: {
    starter: string
    pro: string
  }
}

export function FeatureComparison({ data, labels }: FeatureComparisonProps) {
  return (
    <div className="max-w-4xl mx-auto mt-24">
      <Heading variant="h3" className="text-center mb-12">{data.title}</Heading>
      
      {/* Table Header (Desktop) */}
      <div className="hidden md:grid grid-cols-3 gap-4 mb-6 px-6">
        <div className="font-bold text-[#1A1A1A]/40 uppercase text-xs tracking-widest">Feature</div>
        <div className="font-serif font-bold text-center text-[#1A1A1A]">{labels.starter}</div>
        <div className="font-serif font-bold text-center text-[#D4AF37]">{labels.pro}</div>
      </div>

      <div className="space-y-4">
        {data.categories.map((category, i) => (
          <CategorySection key={i} category={category} />
        ))}
      </div>
    </div>
  )
}

function CategorySection({ category }: { category: FeatureCategory }) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className="bg-white rounded-2xl border border-[#F0EBE0] overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-6 bg-[#F9F7F2] hover:bg-[#F0EBE0] transition-colors"
      >
        <span className="font-bold text-[#1A1A1A]">{category.name}</span>
        {isOpen ? <ChevronUp className="w-4 h-4 opacity-50" /> : <ChevronDown className="w-4 h-4 opacity-50" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-[#F0EBE0]">
              {category.items.map((item, j) => (
                <div key={j} className="grid md:grid-cols-3 gap-4 p-4 items-center text-sm">
                  <div className="font-medium text-[#1A1A1A]/80 pl-2 md:pl-0">{item.name}</div>
                  
                  <div className="flex justify-between md:justify-center items-center">
                    <span className="md:hidden text-[#1A1A1A]/40 text-xs">Starter</span>
                    <ValueDisplay value={item.starter} />
                  </div>
                  
                  <div className="flex justify-between md:justify-center items-center bg-[#F9F7F2]/50 md:bg-transparent p-2 md:p-0 rounded-lg">
                    <span className="md:hidden text-[#D4AF37] text-xs font-bold">Pro</span>
                    <ValueDisplay value={item.pro} highlight />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ValueDisplay({ value, highlight }: { value: string | boolean, highlight?: boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className={`w-5 h-5 ${highlight ? 'text-[#D4AF37]' : 'text-[#1A1A1A]/30'}`} />
    ) : (
      <Minus className="w-4 h-4 text-[#1A1A1A]/20" />
    )
  }
  return <span className={`font-medium ${highlight ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]/60'}`}>{value}</span>
}
