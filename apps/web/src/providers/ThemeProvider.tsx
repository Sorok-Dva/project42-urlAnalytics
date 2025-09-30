import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react'

interface ThemeContextValue {
  theme: 'dark' | 'light'
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark'
    const stored = window.localStorage.getItem('p42-theme')
    return (stored as 'dark' | 'light') ?? 'dark'
  })

  useEffect(() => {
    if (typeof document === 'undefined') return
    const element = document.documentElement
    if (theme === 'dark') element.classList.add('dark')
    else element.classList.remove('dark')
    window.localStorage.setItem('p42-theme', theme)
  }, [theme])

  const value = useMemo(() => ({
    theme,
    toggle: () => setTheme(current => (current === 'dark' ? 'light' : 'dark'))
  }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
