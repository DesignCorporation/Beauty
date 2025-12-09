interface GoogleIconProps {
  className?: string
}

export default function GoogleIcon({ className }: GoogleIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v4.07h5.68c-.25 1.34-1.02 2.48-2.16 3.24l3.49 2.71c2.04-1.89 3.22-4.68 3.22-7.95 0-.77-.07-1.51-.2-2.24H12z"
      />
      <path
        fill="#34A853"
        d="M5.27 14.32l-.83.64-2.78 2.16C3.32 20.9 7.33 23.5 12 23.5c3.24 0 5.95-1.07 7.94-2.91l-3.49-2.71c-.94.63-2.14 1-3.45 1-2.64 0-4.88-1.78-5.68-4.16z"
      />
      <path
        fill="#4285F4"
        d="M2.45 6.88C1.53 8.72 1 10.79 1 13s.53 4.28 1.45 6.12l3.82-2.98c-.28-.84-.44-1.74-.44-2.68s.16-1.84.44-2.68z"
      />
      <path
        fill="#FBBC05"
        d="M12 4.5c1.76 0 3.34.61 4.58 1.8l3.42-3.42C17.95.96 15.24 0 12 0 7.33 0 3.32 2.6 1.46 6.88l3.83 2.96C6.12 6.28 8.36 4.5 12 4.5z"
      />
    </svg>
  )
}
