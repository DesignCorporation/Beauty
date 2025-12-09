interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  variant?: "h1" | "h2" | "h3" | "h4"
  color?: "dark" | "gold" | "white"
  italic?: boolean
}

export function Heading({ 
  className, 
  variant = "h2", 
  color = "dark",
  italic = false,
  ...props 
}: HeadingProps) {
  // Simple class merger
  const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ")

  const Comp = variant === "h1" ? "h1" : variant === "h2" ? "h2" : variant === "h3" ? "h3" : "h4"
  
  const baseStyles = "font-serif font-bold tracking-tight"
  
  const variants = {
    h1: "text-5xl md:text-7xl lg:text-8xl leading-[0.9]",
    h2: "text-4xl md:text-5xl lg:text-6xl leading-tight",
    h3: "text-3xl md:text-4xl leading-tight",
    h4: "text-2xl md:text-3xl leading-snug",
  }

  const colors = {
    dark: "text-[#1A1A1A]",
    white: "text-white",
    gold: "bg-clip-text text-transparent bg-gradient-to-r from-[#BF953F] via-[#CFB53B] to-[#8A6E2F] drop-shadow-sm",
  }

  return (
    <Comp 
      className={cn(baseStyles, variants[variant], colors[color], italic ? "italic" : "", className)} 
      {...props} 
    />
  )
}

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: "body" | "large" | "small" | "label"
  color?: "dark" | "muted" | "gold" | "white"
}

export function Text({ 
  className, 
  variant = "body", 
  color = "muted",
  ...props 
}: TextProps) {
  // Simple class merger
  const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ")

  const Comp = "p"
  
  const baseStyles = "font-sans"
  
  const variants = {
    body: "text-base leading-relaxed",
    large: "text-lg md:text-xl leading-relaxed font-light",
    small: "text-sm leading-relaxed",
    label: "text-xs uppercase tracking-[0.2em] font-medium",
  }

  const colors = {
    dark: "text-[#1A1A1A]",
    muted: "text-[#1A1A1A]/60",
    white: "text-white/90",
    gold: "text-[#B38728]",
  }

  return (
    <Comp 
      className={cn(baseStyles, variants[variant], colors[color], className)} 
      {...props} 
    />
  )
}