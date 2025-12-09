import React from 'react'

interface HeaderContextValue {
  setHeader: (node: React.ReactNode) => void
  clearHeader: () => void
}

const HeaderContext = React.createContext<HeaderContextValue | undefined>(undefined)

export function useHeader(): HeaderContextValue {
  const ctx = React.useContext(HeaderContext)
  if (!ctx) {
    throw new Error('useHeader must be used within HeaderProvider')
  }
  return ctx
}

interface HeaderProviderProps {
  value: HeaderContextValue
  children: React.ReactNode
}

export function HeaderProvider({ value, children }: HeaderProviderProps): JSX.Element {
  return <HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>
}
