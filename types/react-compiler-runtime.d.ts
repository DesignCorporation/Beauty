declare module 'react/compiler-runtime' {
  export const Fragment: typeof import('react').Fragment
  export const jsx: (...args: any[]) => any
  export const jsxs: (...args: any[]) => any
  export const jsxDEV: (...args: any[]) => any
}
