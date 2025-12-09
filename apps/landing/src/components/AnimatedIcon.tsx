'use client'

interface AnimatedIconProps {
  children: React.ReactNode
  className?: string
  hoverColor?: string
}

export function AnimatedIcon({ 
  children, 
  className = "w-16 h-16", 
  hoverColor = "#f59e0b"
}: AnimatedIconProps) {
  return (
    <div className={`${className} mx-auto flex items-center justify-center`}>
      <svg 
        className="w-full h-full transition-all duration-300 group-hover:scale-105"
        viewBox="0 0 24 24" 
        fill="none"
        stroke="#0891b2"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
      >
        <style jsx>{`
          svg {
            stroke: #0891b2;
            transition: stroke 0.3s ease, transform 0.3s ease;
          }
          .group:hover svg {
            stroke: ${hoverColor};
          }
        `}</style>
        {children}
      </svg>
    </div>
  )
}

// SVG Path компоненты для каждой иконки
export function CalendarPath() {
  return (
    <path d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
  )
}

export function UsersPath() {
  return (
    <g>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="m22 21-3-3m0 0a2 2 0 0 0 0-4 2 2 0 0 0 0 4z"/>
    </g>
  )
}

export function ShieldPath() {
  return (
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  )
}

export function BarChart3Path() {
  return (
    <g>
      <path d="M3 3v18h18"/>
      <path d="m19 9-5 5-4-4-3 3"/>
    </g>
  )
}

export function SmartphonePath() {
  return (
    <g>
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
      <path d="M12 18h.01"/>
    </g>
  )
}

export function CreditCardPath() {
  return (
    <g>
      <rect width="20" height="14" x="2" y="5" rx="2"/>
      <path d="M2 10h20"/>
    </g>
  )
}