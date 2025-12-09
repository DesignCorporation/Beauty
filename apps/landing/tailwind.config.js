/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Beauty Design Corp Brand Colors
        'purple-primary': '#8B5CF6',
        'purple-dark': '#7c3aed',
        'purple-light': '#a78bfa',
        'pink-secondary': '#EC4899',
        'pink-dark': '#db2777',
        'green-accent': '#10B981',
        'green-dark': '#059669',
        'bg-light': '#F9FAFB',
        'bg-white': '#FFFFFF',
        'text-primary': '#111827',
        'text-muted': '#6B7280',
        'border-subtle': 'rgba(15, 23, 42, 0.08)',
        
        // Luxury/Gold Theme
        'gold-primary': '#D4AF37',    // Classic Gold
        'gold-metallic': '#C5A059',   // Muted Metallic
        'gold-light': '#E5C670',      // Light Gold
        'sand-light': '#FDFCF8',      // Cream/Off-white
        'sand-medium': '#F2F0E9',     // Darker cream
        'charcoal-dark': '#1A1A1A',   // Soft Black
        'charcoal-light': '#2D2D2D',  // Dark Grey
      },
      fontFamily: {
        sans: ['var(--font-montserrat)', 'sans-serif'],
        serif: ['var(--font-playfair)', 'serif'],
      },
      fontSize: {
        'hero': ['56px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'h1': ['48px', { lineHeight: '1.2', fontWeight: '700' }],
        'h2': ['40px', { lineHeight: '1.3', fontWeight: '600' }],
        'h3': ['32px', { lineHeight: '1.3', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '1.6' }],
        'sm': ['14px', { lineHeight: '1.5' }],
      },
      spacing: {
        'section': '5rem',
        'section-lg': '6rem',
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '24px',
        '3xl': '28px',
      },
      boxShadow: {
        'card': '0 18px 45px rgba(15, 23, 42, 0.06)',
        'card-lg': '0 40px 120px rgba(17, 24, 39, 0.12)',
        'hover': '0 24px 60px rgba(17, 24, 39, 0.08)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-hero': 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.05) 100%)',
        'hero-gradient': 'radial-gradient(circle at center, #06b6d4 0%, #0891b2 50%, #0e7490 100%)',
        'cta-gradient': 'radial-gradient(circle at center, #06b6d4 0%, #0891b2 50%, #0e7490 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
  safelist: [
    'bg-gradient-radial',
    'bg-hero-gradient',
    'bg-cta-gradient',
    'from-cyan-400',
    'to-teal-700',
  ],
}