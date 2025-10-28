import { ThemeTokens } from '../components/types'
import { lightThemeColors, darkThemeColors } from './colors'
import { borderRadius } from './spacing'

/**
 * Stripe-inspired theme tokens for the app
 * Clean, professional, accessible design
 */

export const lightTheme: ThemeTokens = {
  background: lightThemeColors.backgroundAlt,
  surface: lightThemeColors.surface,
  surfaceElevated: lightThemeColors.surfaceElevated,
  text: lightThemeColors.text,
  textMuted: lightThemeColors.textSecondary,
  border: lightThemeColors.border,
  focus: `${lightThemeColors.primary}33`, // 20% opacity
  primary: lightThemeColors.primary,
  radius: borderRadius.lg,
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

export const darkTheme: ThemeTokens = {
  background: darkThemeColors.background,
  surface: darkThemeColors.surface,
  surfaceElevated: darkThemeColors.surfaceElevated,
  text: darkThemeColors.text,
  textMuted: darkThemeColors.textSecondary,
  border: darkThemeColors.border,
  focus: `${darkThemeColors.primary}66`, // 40% opacity
  primary: darkThemeColors.primary,
  radius: borderRadius.lg,
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

// Theme merger function (for partial theme overrides)
export function mergeTheme(custom?: Partial<ThemeTokens>): ThemeTokens {
  if (!custom) return defaultTheme
  return {
    ...defaultTheme,
    ...custom,
    spacing: { ...defaultTheme.spacing, ...custom.spacing },
    shadow: { ...defaultTheme.shadow, ...custom.shadow },
  }
}

// Export complete color palette for use in components
export { lightThemeColors, darkThemeColors } from './colors'
export { typography } from './typography'
export { spacing, borderRadius, elevation, iconSize } from './spacing'
