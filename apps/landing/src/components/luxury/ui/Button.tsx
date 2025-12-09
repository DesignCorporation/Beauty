'use client'

import * as React from "react"
import { ArrowRight, Loader2 } from "lucide-react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost"
  size?: "default" | "lg"
  isLoading?: boolean
  icon?: React.ReactNode
  fullWidth?: boolean
}

export function Button({ 
  className, 
  variant = "primary", 
  size = "default", 
  isLoading = false,
  icon,
  fullWidth = false,
  children,
  ...props 
}: ButtonProps) {
  
  const baseStyles = "relative group inline-flex items-center justify-center rounded-full font-bold uppercase tracking-widest transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none overflow-hidden"
  
  const sizes = {
    default: "px-8 py-3 text-xs",
    lg: "px-10 py-4 text-sm",
  }

  const variants = {
    primary: "text-white hover:scale-105 shadow-[0_10px_30px_rgba(191,149,63,0.3)] hover:shadow-[0_15px_40px_rgba(191,149,63,0.4)]",
    outline: "border border-[#1A1A1A]/10 text-[#1A1A1A]/70 hover:text-[#B38728] hover:border-[#D4AF37] hover:bg-[#D4AF37]/5",
    ghost: "text-[#B38728] hover:text-[#1A1A1A] underline decoration-1 underline-offset-4 decoration-[#B38728]/30 hover:decoration-[#1A1A1A]",
  }

  const width = fullWidth ? "w-full" : "w-fit"

  return (
    <button 
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${width} ${className || ""}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {variant === "primary" && (
        <>
          {/* Gold Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#BF953F] via-[#D4AF37] to-[#AA771C]" />
          {/* Shimmer Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
        </>
      )}

      <span className="relative z-10 flex items-center gap-2">
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {!isLoading && children}
        {!isLoading && icon ? icon : (!isLoading && variant === "primary" ? <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /> : null)}
      </span>
    </button>
  )
}
