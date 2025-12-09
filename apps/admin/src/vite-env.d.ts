interface ImportMetaEnv {
  readonly VITE_API_GATEWAY_ORIGIN?: string
  readonly VITE_API_URL?: string
  readonly VITE_MCP_URL?: string
  readonly VITE_MCP_WS_URL?: string
  readonly VITE_AUTH_URL?: string
  readonly NODE_ENV?: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
