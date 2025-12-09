interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  variant?: "ivory" | "white" | "dark"
  container?: boolean
}

export function Section({ 
  className, 
  variant = "ivory", 
  container = true,
  children, 
  ...props 
}: SectionProps) {
  
  const variants = {
    ivory: "bg-[#F9F7F2]",
    white: "bg-white",
    dark: "bg-[#1A1A1A] text-[#F9F7F2]",
  }

  return (
    <section 
      className={`${variants[variant]} py-20 md:py-32 relative overflow-hidden ${className || ""}`}
      {...props}
    >
      {/* Optional Texture Overlay for Ivory/White sections */}
      {(variant === "ivory" || variant === "white") && (
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-30 pointer-events-none mix-blend-multiply" />
      )}

      {container ? (
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  )
}