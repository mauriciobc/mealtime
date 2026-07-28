'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // next-themes injects an inline <script> to prevent theme flash (FOUC).
  // On SSR the script runs normally; on client hydration React 19 errors if
  // type is text/javascript. application/json suppresses the warning without
  // re-executing the script (already ran from SSR HTML).
  const scriptProps =
    typeof window === 'undefined'
      ? undefined
      : ({ type: 'application/json' } as const)

  return (
    <NextThemesProvider scriptProps={scriptProps} {...props}>
      {children}
    </NextThemesProvider>
  )
}
