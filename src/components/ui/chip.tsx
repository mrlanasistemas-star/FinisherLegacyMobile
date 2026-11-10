import type { LucideIcon } from 'lucide-react-native';

import { AppText } from '@/components/app-text';
import { PressableScale } from '@/components/motion/pressable-scale';
import { colors, fontFamily } from '@/theme/tokens';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
}

/** Filter / choice chip. 36pt visual, 44pt touch target via hitSlop. Selected = carbon fill (not gold). */
export function Chip({ label, selected = false, onPress, icon: Icon, disabled }: ChipProps) {
  const fg = selected ? colors.onDark : colors.foreground;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || !onPress}
      scaleTo={0.95}
      haptic={onPress ? 'selection' : 'none'}
      hitSlop={{ top: 4, bottom: 4 }}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected, disabled }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 36,
        paddingHorizontal: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: selected ? colors.black : colors.border,
        backgroundColor: selected ? colors.black : colors.card,
        opacity: disabled ? 0.4 : 1,
      }}>
      {Icon ? <Icon size={15} color={selected ? colors.gold : colors.muted} /> : null}
      <AppText maxFontSizeMultiplier={1.3} style={{ fontFamily: fontFamily.medium, fontSize: 14, color: fg }}>
        {label}
      </AppText>
    </PressableScale>
  );
}
