import { BRAND } from '@/lib/brand'
import { useColorScheme } from 'nativewind'
import Svg, { Path, type SvgProps } from 'react-native-svg'

type VoiceClawMarkProps = SvgProps & {
  size?: number
  accent?: boolean
  color?: string
}

export function VoiceClawMark({
  size = 32,
  accent = false,
  color,
  ...props
}: VoiceClawMarkProps) {
  const { colorScheme } = useColorScheme()
  const palette = colorScheme === 'dark' ? BRAND.colors.dark : BRAND.colors.light
  const stroke = color ?? palette.ink
  const accentStroke = accent ? palette.accent : stroke

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      accessibilityRole="image"
      {...props}
    >
      <Path
        d="M20 10 H14 V54 H20"
        stroke={stroke}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M20 10 L27 17" stroke={stroke} strokeWidth={4} strokeLinecap="round" />
      <Path d="M20 54 L27 47" stroke={stroke} strokeWidth={4} strokeLinecap="round" />
      <Path
        d="M44 10 H50 V54 H44"
        stroke={stroke}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M44 10 L37 17" stroke={stroke} strokeWidth={4} strokeLinecap="round" />
      <Path d="M44 54 L37 47" stroke={stroke} strokeWidth={4} strokeLinecap="round" />
      <Path d="M29 40 V24" stroke={accentStroke} strokeWidth={4.5} strokeLinecap="round" />
      <Path d="M35 46 V18" stroke={stroke} strokeWidth={4.5} strokeLinecap="round" />
      <Path d="M41 37 V27" stroke={stroke} strokeWidth={4.5} strokeLinecap="round" />
    </Svg>
  )
}
