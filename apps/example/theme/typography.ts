import { Platform, TextStyle } from 'react-native'

/**
 * Typography scale following Stripe's clean, readable style
 * Uses system fonts for optimal rendering on each platform
 */

export const fontFamily = {
  regular: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  medium: Platform.select({
    ios: 'System',
    android: 'Roboto-Medium',
    default: 'System',
  }),
  semibold: Platform.select({
    ios: 'System',
    android: 'Roboto-Medium', // Android doesn't have semibold, use medium
    default: 'System',
  }),
  bold: Platform.select({
    ios: 'System',
    android: 'Roboto-Bold',
    default: 'System',
  }),
}

export const fontWeight = {
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
}

// Typography styles
export const typography = {
  // Display - for hero sections
  displayLarge: {
    fontSize: 44,
    lineHeight: 52,
    fontWeight: fontWeight.bold,
    letterSpacing: -1,
  } as TextStyle,

  displayMedium: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
  } as TextStyle,

  displaySmall: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
  } as TextStyle,

  // Headings
  headingLarge: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: fontWeight.semibold,
    letterSpacing: -0.25,
  } as TextStyle,

  headingMedium: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0,
  } as TextStyle,

  headingSmall: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0,
  } as TextStyle,

  // Body text
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: fontWeight.regular,
    letterSpacing: 0,
  } as TextStyle,

  bodyMedium: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: fontWeight.regular,
    letterSpacing: 0,
  } as TextStyle,

  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeight.regular,
    letterSpacing: 0,
  } as TextStyle,

  // Labels and captions
  labelLarge: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeight.medium,
    letterSpacing: 0.1,
  } as TextStyle,

  labelMedium: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeight.medium,
    letterSpacing: 0.1,
  } as TextStyle,

  labelSmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeight.medium,
    letterSpacing: 0.2,
  } as TextStyle,

  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeight.regular,
    letterSpacing: 0,
  } as TextStyle,

  // Button text
  buttonLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0,
  } as TextStyle,

  buttonMedium: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0,
  } as TextStyle,

  buttonSmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0,
  } as TextStyle,
}
