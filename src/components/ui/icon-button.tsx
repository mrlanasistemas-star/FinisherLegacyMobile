import type { LucideIcon } from 'lucide-react-native';
import { Pressable, View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, fontFamily } from '@/theme/tokens';

interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  /** Numeric badge (cart items, unread) — hidden at 0. */
  badge?: number;
  /** Small dot instead of a number. */
  dot?: boolean;
  /** Filled translucent circle — for buttons floating over media. */
  filled?: boolean;
  color?: string;
  size?: number;
  disabled?: boolean;
  style?: ViewStyle;
}

/** Always a 44×44 touch target, whatever the glyph size. */
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
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={showBadge ? `${label}, ${badge}` : label}
      hitSlop={4}
      style={({ pressed }) => [
        {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: filled ? 'rgba(10,10,12,0.55)' : 'transparent',
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
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
              borderColor: colors.black,
            }}>
            <AppText style={{ fontFamily: fontFamily.bold, fontSize: 10, color: colors.black }}>{badge > 99 ? '99+' : badge}</AppText>
          </View>
        ) : dot ? (
          <View style={{ position: 'absolute', top: -1, right: -1, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold }} />
        ) : null}
      </View>
    </Pressable>
  );
}
