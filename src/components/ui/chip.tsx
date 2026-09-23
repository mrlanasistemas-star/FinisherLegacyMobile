import type { LucideIcon } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, fontFamily } from '@/theme/tokens';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
}

/** Filter / choice chip. 36pt tall visual, 44pt touch target via hitSlop. */
export function Chip({ label, selected = false, onPress, icon: Icon, disabled }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      hitSlop={{ top: 4, bottom: 4 }}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 36,
        paddingHorizontal: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: selected ? colors.gold : colors.inputBorder,
        backgroundColor: selected ? colors.goldWash : 'transparent',
        opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
      })}>
      {Icon ? <Icon size={15} color={selected ? colors.gold : colors.muted} /> : null}
      <AppText style={{ fontFamily: fontFamily.medium, fontSize: 14, color: selected ? colors.gold : colors.foreground }}>{label}</AppText>
    </Pressable>
  );
}
