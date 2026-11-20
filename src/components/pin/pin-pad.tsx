/**
 * Numeric PIN entry: a row of dots + an iOS-style 3×4 keypad. The PIN
 * lives only in the parent's component state while it is typed — it is
 * never persisted, logged or put in a query. 4–6 digits, so the parent
 * shows its own "Continuar" button once `minLength` digits are in.
 */

import { Delete } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { useI18n } from '@/i18n';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

interface PinPadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  disabled?: boolean;
  /** Shake-free error hint: the dots turn red. */
  error?: boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

export function PinDots({ length, filled, error }: { length: number; filled: number; error?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length }, (_, index) => {
        const on = index < filled;
        return (
          <View
            key={index}
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              borderWidth: 1.5,
              borderColor: error ? colors.destructive : on ? colors.gold : colors.inputBorder,
              backgroundColor: on ? (error ? colors.destructive : colors.gold) : 'transparent',
            }}
          />
        );
      })}
    </View>
  );
}

export function PinPad({ value, onChange, maxLength = 6, disabled = false, error = false }: PinPadProps) {
  const { t } = useI18n();

  function press(key: (typeof KEYS)[number]) {
    if (disabled || key === '') return;
    void haptics.selection();
    if (key === 'del') {
      onChange(value.slice(0, -1));
      return;
    }
    if (value.length >= maxLength) return;
    onChange(value + key);
  }

  return (
    <View style={{ gap: spacing.lg, alignItems: 'center' }}>
      <View accessible accessibilityLabel={t('{count} de {max} dígitos', { count: value.length, max: maxLength })}>
        <PinDots length={maxLength} filled={value.length} error={error} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 3 * 76 + 2 * spacing.lg, gap: spacing.md, columnGap: spacing.lg }}>
        {KEYS.map((key, index) =>
          key === '' ? (
            <View key={index} style={{ width: 76, height: 76 }} />
          ) : (
            <Pressable
              key={index}
              onPress={() => press(key)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={key === 'del' ? t('Borrar') : key}
              style={({ pressed }) => ({
                width: 76,
                height: 76,
                borderRadius: 38,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: key === 'del' ? 'transparent' : pressed ? colors.goldWash : colors.card,
                borderWidth: key === 'del' ? 0 : 1,
                borderColor: colors.hairline,
                opacity: disabled ? 0.45 : 1,
              })}>
              {key === 'del' ? (
                <Delete size={26} color={colors.foreground} strokeWidth={1.8} />
              ) : (
                <AppText maxFontSizeMultiplier={1.2} style={{ fontFamily: fontFamily.headingSemibold, fontSize: 28, color: colors.foreground }}>
                  {key}
                </AppText>
              )}
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}
