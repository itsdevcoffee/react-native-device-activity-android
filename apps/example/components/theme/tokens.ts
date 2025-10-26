import { ThemeTokens } from '../types'

// Notion-like Light Theme (Default)
export const lightTheme: ThemeTokens = {
  background: '#F6F5F4',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  text: '#202425',
  textMuted: '#6B7277',
  border: 'rgba(0,0,0,0.08)',
  focus: 'rgba(0,248,167,0.20)',
  primary: '#00f8a7',
  radius: 12,
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
  },
  shadow: {
    low: 2,
    med: 4,
    high: 8,
  },
}

// Dark Theme Variant
export const darkTheme: ThemeTokens = {
  background: '#0b0c0f',
  surface: '#111418',
  surfaceElevated: '#171b22',
  text: '#e7ecf3',
  textMuted: '#9aa7b5',
  border: 'rgba(255,255,255,0.06)',
  focus: 'rgba(0,248,167,0.55)',
  primary: '#00f8a7',
  radius: 12,
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
  },
  shadow: {
    low: 2,
    med: 4,
    high: 8,
  },
}

// Default to light theme
export const defaultTheme = lightTheme

export function mergeTheme(custom?: Partial<ThemeTokens>): ThemeTokens {
  if (!custom) return defaultTheme
  return {
    ...defaultTheme,
    ...custom,
    spacing: { ...defaultTheme.spacing, ...custom.spacing },
    shadow: { ...defaultTheme.shadow, ...custom.shadow },
  }
}
