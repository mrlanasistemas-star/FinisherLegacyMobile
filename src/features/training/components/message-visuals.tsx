import { LinearGradient } from 'expo-linear-gradient';
import { BicepsFlexed, Flag, Flame, Heart, Medal, Rocket, Star, Sun, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import type { TrainingIcon } from '@/schemas/training';
import { gradients } from '@/theme/gradients';
import { colors, fontFamily } from '@/theme/tokens';

/**
 * Small visual vocabulary of a training message, shared by the list, the
 * mini-player and the full player: the sender's initials avatar with the
 * gold icon badge the sender picked, and a decorative mini waveform.
 */

export const ICONS: Record<TrainingIcon, LucideIcon> = {
  heart: Heart,
  fire: Flame,
  medal: Medal,
  muscle: BicepsFlexed,
  star: Star,
  flag: Flag,
  sun: Sun,
  rocket: Rocket,
};

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : (parts[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

interface SenderAvatarProps {
  name: string;
  icon: TrainingIcon;
  size?: number;
  /** Unheard: gold ring. */
  highlight?: boolean;
}

/** Bone disc with carbon initials, gold hairline ring, and the message icon in a carbon badge. */
export function SenderAvatar({ name, icon, size = 48, highlight = false }: SenderAvatarProps) {
  const Icon = ICONS[icon];
  const badge = Math.round(size * 0.42);
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LinearGradient
        colors={highlight ? gradients.gold : ['#EFECE5', '#E3DED4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: size, height: size, borderRadius: size / 2, padding: highlight ? 2 : 1 }}>
        <View style={{ flex: 1, borderRadius: size / 2, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
          <AppText
            maxFontSizeMultiplier={1.1}
            style={{ fontFamily: fontFamily.heading, fontSize: size * 0.34, color: colors.foreground, letterSpacing: 0.5 }}>
            {initialsOf(name)}
          </AppText>
        </View>
      </LinearGradient>
      <View
        style={{
          position: 'absolute',
          right: -2,
          bottom: -2,
          width: badge,
          height: badge,
          borderRadius: badge / 2,
          backgroundColor: colors.black,
          borderWidth: 2,
          borderColor: colors.card,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon size={badge * 0.52} color={colors.gold} strokeWidth={2.2} />
      </View>
    </View>
  );
}

/** Stable pseudo-random bar heights from a seed (decorative only — not audio data). */
export function waveformBars(seed: string, count: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i += 1) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const r = ((h >>> 0) % 1000) / 1000;
    // Soft envelope so it reads like speech: quieter ends, fuller middle.
    const envelope = 0.45 + 0.55 * Math.sin((Math.PI * (i + 0.5)) / count);
    bars.push(0.22 + 0.78 * r * envelope);
  }
  return bars;
}

interface MiniWaveformProps {
  seed: string;
  /** 0..1 played fraction (gold); the rest is muted. */
  progress?: number;
  bars?: number;
  height?: number;
  width?: number;
}

export function MiniWaveform({ seed, progress = 0, bars = 22, height = 18, width = 84 }: MiniWaveformProps) {
  const values = waveformBars(seed, bars);
  const barWidth = 2;
  const gap = (width - bars * barWidth) / Math.max(1, bars - 1);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, height, flexDirection: 'row', alignItems: 'center', gap }}>
      {values.map((v, i) => (
        <View
          key={i}
          style={{
            width: barWidth,
            height: Math.max(3, v * height),
            borderRadius: 1,
            backgroundColor: i / bars < progress ? colors.gold : colors.border,
          }}
        />
      ))}
    </View>
  );
}
