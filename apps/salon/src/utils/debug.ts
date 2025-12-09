const isDevEnvironment = (() => {
  try {
    return Boolean(import.meta.env?.DEV)
  } catch {
    return false
  }
})()

export const debugLog = (...args: unknown[]): void => {
  if (isDevEnvironment) {
    console.debug(...args)
  }
}

export const debugWarn = (...args: unknown[]): void => {
  if (isDevEnvironment) {
    console.warn(...args)
  }
}
