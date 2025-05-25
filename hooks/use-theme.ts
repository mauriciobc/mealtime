import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'
// Accent color options
const ACCENT_COLORS = ['red', 'rose', 'orange', 'yellow', 'green', 'blue', 'violet'] as const;
type Accent = typeof ACCENT_COLORS[number];
const DEFAULT_ACCENT: Accent = 'blue';

// Map accent to HSL or HEX (for --accent CSS var)
const ACCENT_COLOR_MAP: Record<Accent, string> = {
  red:    '#ef4444',
  rose:   '#fb7185',
  orange: '#f59e42',
  yellow: '#eab308',
  green:  '#22c55e',
  blue:   '#3b82f6',
  violet: '#8b5cf6',
};

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system')
  const [accent, setAccent] = useState<Accent>(DEFAULT_ACCENT)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme
    if (savedTheme) {
      setTheme(savedTheme)
      applyTheme(savedTheme)
    }
    const savedAccent = localStorage.getItem('accent') as Accent
    if (savedAccent && ACCENT_COLORS.includes(savedAccent)) {
      setAccent(savedAccent)
      applyAccent(savedAccent)
    } else {
      applyAccent(DEFAULT_ACCENT)
    }
  }, [])

  const applyTheme = (newTheme: Theme) => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    let themeClass = '';
    if (newTheme === 'system') {
      themeClass = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.add(themeClass)
    } else {
      themeClass = newTheme;
      root.classList.add(themeClass)
    }

    // Re-apply accent color after theme is set to ensure correct variant (.theme-{color} or .theme-{color}.dark) is active
    applyAccent(accent);
  }

  // Remove all .theme-* classes, then add the new one if not blue
  const applyAccent = (newAccent: Accent) => {
    const root = window.document.documentElement
    ACCENT_COLORS.forEach(color => {
      root.classList.remove(`theme-${color}`)
    })

    // Determine current theme (light/dark) for specificity
    let currentTheme: Theme;
    if (theme === 'system') {
      currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      currentTheme = theme;
    }
    root.classList.remove('light', 'dark');
    root.classList.add(currentTheme);

    if (newAccent !== 'blue') {
      root.classList.add(`theme-${newAccent}`)
    }
  }

  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
  }

  const changeAccent = (newAccent: Accent) => {
    setAccent(newAccent)
    localStorage.setItem('accent', newAccent)
    applyAccent(newAccent)
  }

  return { theme, changeTheme, accent, changeAccent }
} 