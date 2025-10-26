import React, { memo, useMemo } from 'react'
import { Image, View, Text, StyleSheet } from 'react-native'

type IconProps = {
  uri?: string
  name: string
  size: number
  borderRadius?: number
  backgroundColor?: string
  textColor?: string
}

const IconComponent = ({
  uri,
  name,
  size,
  borderRadius = 12,
  backgroundColor = '#171b22',
  textColor = '#9aa7b5',
}: IconProps) => {
  const imageStyle = useMemo(
    () => ({
      width: size,
      height: size,
      borderRadius,
      backgroundColor,
    }),
    [size, borderRadius, backgroundColor]
  )

  const letter = useMemo(() => name.charAt(0).toUpperCase(), [name])
  const fontSize = useMemo(() => size * 0.48, [size])

  if (uri) {
    const source = uri.startsWith('data:')
      ? { uri }
      : { uri, cache: 'force-cache' as const }

    return (
      <Image
        source={source}
        style={[styles.image, imageStyle]}
        resizeMode="cover"
      />
    )
  }

  return (
    <View style={[styles.fallback, imageStyle]}>
      <Text style={[styles.fallbackText, { fontSize, color: textColor }]}>
        {letter}
      </Text>
    </View>
  )
}

export const Icon = memo(
  IconComponent,
  (prev, next) =>
    prev.uri === next.uri &&
    prev.name === next.name &&
    prev.size === next.size &&
    prev.borderRadius === next.borderRadius &&
    prev.backgroundColor === next.backgroundColor &&
    prev.textColor === next.textColor
)

Icon.displayName = 'Icon'

const styles = StyleSheet.create({
  image: {},
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontWeight: '600',
  },
})
