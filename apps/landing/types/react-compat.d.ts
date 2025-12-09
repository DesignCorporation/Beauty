declare global {
  namespace React {
    type ActionDispatch<A = unknown> = (action: A) => void
  }
}

export {}
