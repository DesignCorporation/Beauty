interface ImportMetaEnv {
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string
  readonly VITE_API_GATEWAY_ORIGIN?: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
