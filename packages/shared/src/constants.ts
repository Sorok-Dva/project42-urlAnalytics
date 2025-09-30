export const AppName = 'P42 | MIR-ALPHA'

export const DefaultTheme = {
  dark: true,
  brand: '#7f5af0',
  accent: '#2cb67d',
  background: '#0f172a',
  surface: '#111827',
  text: '#e2e8f0'
}

export const DateIntervals = [
  { id: 'all', label: 'All' },
  { id: '1y', label: '1Y' },
  { id: '3m', label: '3M' },
  { id: '1m', label: '1M' },
  { id: '1w', label: '1W' },
  { id: '1d', label: '1D' }
] as const

export const FeatureFlags = {
  linkInBio: false
}
