'use client'

import { motion } from 'framer-motion'
import { PlayCircle } from 'lucide-react'
import { Heading, Text } from '@/components/luxury/ui/Typography'
import { Button } from '@/components/luxury/ui/Button'

interface HeroSectionProps {
  eyebrow: string
  title: {
    gold: string
    regular: string
  }
  subtitle: string
  cta: {
    primary: string
    secondary: string
  }
  videoSrc?: string
}

export function HeroSection({ 
  eyebrow, 
  title, 
  subtitle, 
  cta,
  videoSrc = "/video/mixkit-applying-the-polish-in-the-salon-23596-hd-ready.mp4"
}: HeroSectionProps) {
  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-[#F5F0E6]">
      {/* Video/Image Background Placeholder - Light Overlay */}
      <div className="absolute inset-0 opacity-10 mix-blend-multiply pointer-events-none">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-50" />
         <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="w-full h-full object-cover opacity-50"
        >
           <source src={videoSrc} type="video/mp4" />
        </video>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center mt-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <span className="inline-block py-1 px-4 border border-[#D4AF37]/40 rounded-full text-[#B38728] text-xs tracking-[0.3em] uppercase mb-8 bg-white/50 backdrop-blur-sm shadow-sm">
            {eyebrow}
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="mb-10"
        >
          <Heading variant="h1" className="mb-2">
             <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#BF953F] via-[#CFB53B] to-[#8A6E2F] drop-shadow-sm pb-2 block">
              {title.gold}
            </span>
            <span className="italic font-light text-[#1A1A1A] block">
              {title.regular}
            </span>
          </Heading>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
        >
          <Text variant="large" className="max-w-xl mx-auto mb-14">
            {subtitle}
          </Text>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="flex flex-col md:flex-row items-center justify-center gap-8"
        >
          <Button size="lg">
            {cta.primary}
          </Button>
          
          <button className="flex items-center gap-4 text-[#1A1A1A]/70 hover:text-[#B38728] transition-colors group">
            <div className="w-14 h-14 rounded-full border border-[#1A1A1A]/10 flex items-center justify-center group-hover:border-[#D4AF37] group-hover:bg-[#D4AF37]/5 transition-all duration-300">
              <PlayCircle className="w-6 h-6 opacity-70 group-hover:opacity-100" />
            </div>
            <span className="text-sm uppercase tracking-widest font-medium">{cta.secondary}</span>
          </button>
        </motion.div>
      </div>
    </section>
  )
}
