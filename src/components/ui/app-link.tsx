import { useState } from 'react';
import { Pressable } from 'react-native';

import { AppText } from '@/components/app-text';

import { colors } from '@/theme/tokens';

interface AppLinkProps {
  label: string;
  onPress: () => void;
  tone?: 'gold' | 'muted';
  small?: boolean;
}

/** Text link with real states — touch target stays 44pt via hitSlop even though the label itself is small (AGENTS.md §179/§201). */
export function AppLink({ label, onPress, tone = 'gold', small = false }: AppLinkProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <AppText
        variant={small ? 'caption' : 'bodyStrong'}
        style={{
          color: tone === 'gold' ? colors.gold : colors.foreground,
          textDecorationLine: hovered ? 'underline' : 'none',
        }}>
        {label}
      </AppText>
    </Pressable>
  );
}
