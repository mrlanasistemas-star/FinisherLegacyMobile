import { Minus, Plus, Trash2 } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, fontFamily } from '@/theme/tokens';

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
  const size = compact ? 32 : 40;
  const atMin = value <= min;
  const DecrementIcon = atMin && onRemove ? Trash2 : Minus;

  const button = (icon: typeof Minus, label: string, onPress: () => void, isDisabled: boolean) => {
    const Icon = icon;
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => ({
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isDisabled ? 0.3 : pressed ? 0.6 : 1,
        })}>
        <Icon size={compact ? 14 : 16} color={colors.foreground} />
      </Pressable>
    );
  };

  return (
    <View
      accessibilityLabel={`Cantidad ${value}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.inputBorder,
        borderRadius: size / 2 + 1,
        backgroundColor: colors.input,
      }}>
      {button(
        DecrementIcon,
        atMin && onRemove ? 'Quitar' : 'Disminuir cantidad',
        () => (atMin && onRemove ? onRemove() : onChange(value - 1)),
        !!disabled || (atMin && !onRemove),
      )}
      <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 15, minWidth: 22, textAlign: 'center' }}>{value}</AppText>
      {button(Plus, 'Aumentar cantidad', () => onChange(value + 1), !!disabled || value >= max)}
    </View>
  );
}
