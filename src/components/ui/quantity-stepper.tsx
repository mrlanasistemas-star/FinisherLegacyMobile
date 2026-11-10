import { Minus, Plus, Trash2 } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PressableScale } from '@/components/motion/pressable-scale';
import { colors, fontFamily } from '@/theme/tokens';
import { useI18n } from '@/i18n';

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  /** At `min`, the minus becomes a trash icon that calls onRemove. */
  onRemove?: () => void;
  compact?: boolean;
}

export function QuantityStepper({ value, onChange, min = 1, max = 20, disabled, onRemove, compact = false }: QuantityStepperProps) {
  const { t } = useI18n();
  const size = compact ? 32 : 40;
  const atMin = value <= min;
  const DecrementIcon = atMin && onRemove ? Trash2 : Minus;

  const button = (icon: typeof Minus, label: string, onPress: () => void, isDisabled: boolean) => {
    const Icon = icon;
    return (
      <PressableScale
        onPress={onPress}
        haptic="selection"
        scaleTo={0.88}
        disabled={isDisabled}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isDisabled ? 0.3 : 1,
        }}>
        <Icon size={compact ? 14 : 16} color={colors.foreground} />
      </PressableScale>
    );
  };

  return (
    <View
      accessibilityLabel={t('Cantidad {value}', { value })}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.hairline,
        borderRadius: size / 2 + 1,
        backgroundColor: colors.card,
      }}>
      {button(
        DecrementIcon,
        atMin && onRemove ? t('Quitar') : t('Disminuir cantidad'),
        () => (atMin && onRemove ? onRemove() : onChange(value - 1)),
        !!disabled || (atMin && !onRemove),
      )}
      <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 15, minWidth: 22, textAlign: 'center' }}>{value}</AppText>
      {button(Plus, t('Aumentar cantidad'), () => onChange(value + 1), !!disabled || value >= max)}
    </View>
  );
}
