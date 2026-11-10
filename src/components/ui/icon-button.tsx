import type { LucideIcon } from 'lucide-react-native';
import { View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/app-text';
import { PressableScale } from '@/components/motion/pressable-scale';
import { colors, fontFamily } from '@/theme/tokens';

interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  /** Numeric badge (cart items, unread) — hidden at 0. */
  badge?: number;
  /** Small dot instead of a number. */
  dot?: boolean;
  /** Frosted white circle — for buttons floating over photos/video. */
  filled?: boolean;
  color?: string;
  size?: number;
  disabled?: boolean;
  style?: ViewStyle;
}

/** Always a 44×44 touch target, whatever the glyph size. Spring press. */
export function IconButton({
  icon: Icon,
  label,
  onPress,
  badge,
  dot,
  filled = false,
  color = colors.foreground,
  size = 22,
  disabled,
  style,
}: IconButtonProps) {
  const showBadge = typeof badge === 'number' && badge > 0;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.88}
      accessibilityRole="button"
      accessibilityLabel={showBadge ? `${label}, ${badge}` : label}
      hitSlop={4}
      style={[
        {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: filled ? 'rgba(255,255,255,0.9)' : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
        filled && { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 2 },
        style,
      ]}>
      <View>
        <Icon size={size} color={color} strokeWidth={1.9} />
        {showBadge ? (
          <View
            style={{
              position: 'absolute',
              top: -6,
              right: -9,
              minWidth: 18,
              height: 18,
              paddingHorizontal: 4,
              borderRadius: 9,
              backgroundColor: colors.gold,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: colors.background,
            }}>
            <AppText maxFontSizeMultiplier={1.2} style={{ fontFamily: fontFamily.bold, fontSize: 10, color: colors.onGold }}>
              {badge > 99 ? '99+' : badge}
            </AppText>
          </View>
        ) : dot ? (
          <View style={{ position: 'absolute', top: -1, right: -1, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold }} />
        ) : null}
      </View>
    </PressableScale>
  );
}
