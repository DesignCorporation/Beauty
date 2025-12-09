import 'react-router'
import '@remix-run/router'

declare module '@remix-run/router' {
  interface AgnosticBaseRouteObject {
    caseSensitive?: boolean | undefined
  }
}

declare module 'react-router' {
  interface IndexRouteObject {
    caseSensitive?: boolean | undefined
  }

  interface NonIndexRouteObject {
    caseSensitive?: boolean | undefined
  }

  interface PathPattern<Path extends string = string> {
    caseSensitive?: boolean | undefined
  }
}
