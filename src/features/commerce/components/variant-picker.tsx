import { Check } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { useI18n } from '@/i18n';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import type { ProductVariant } from '@/types/models';
import { haptics } from '@/utils/haptics';

import {
  buildAxes,
  findVariant,
  isColorAvailable,
  isSizeAvailable,
  isVariantAvailable,
  variantColor,
  variantSize,
} from '../variant-options';

interface VariantPickerProps {
  variants: ProductVariant[];
  selected: ProductVariant | null;
  onSelect: (variant: ProductVariant) => void;
}

/**
 * Color swatches + size chips when variants carry those axes (apparel);
 * plain option chips otherwise. Sold-out combinations stay visible but
 * struck through — the athlete sees the full range, never a hidden size.
 */
export function VariantPicker({ variants, selected, onSelect }: VariantPickerProps) {
  const { t } = useI18n();
  const axes = buildAxes(variants);
  if (variants.length <= 1) return null;

  if (!axes.structured || (axes.sizes.length === 0 && axes.colors.length === 0)) {
    return (
      <Group label={selected ? t('Opción: {name}', { name: selected.name }) : t('Elige una opción')}>
        {variants.map((variant) => (
          <OptionChip
            key={variant.uuid}
            label={variant.name}
            active={selected?.uuid === variant.uuid}
            unavailable={!isVariantAvailable(variant)}
            onPress={() => onSelect(variant)}
          />
        ))}
      </Group>
    );
  }

  const currentColor = selected ? variantColor(selected) : null;
  const currentSize = selected ? variantSize(selected) : null;

  function pick(size: string | null, color: string | null) {
    // Keep the other axis when that combination exists; otherwise fall back
    // to the first buyable match on the axis the athlete just touched.
    const exact = findVariant(variants, size, color);
    const fallback =
      variants.find((v) => (size === null || variantSize(v) === size) && (color === null || variantColor(v) === color) && isVariantAvailable(v)) ??
      variants.find((v) => (color !== null ? variantColor(v) === color : variantSize(v) === size) && isVariantAvailable(v)) ??
      variants.find((v) => (color !== null ? variantColor(v) === color : variantSize(v) === size));
    const next = exact && isVariantAvailable(exact) ? exact : (fallback ?? exact);
    if (next) {
      haptics.selection();
      onSelect(next);
    }
  }

  return (
    <View style={{ gap: spacing.md }}>
      {axes.colors.length > 0 ? (
        <Group label={currentColor ? t('Color: {name}', { name: currentColor }) : t('Color')}>
          {axes.colors.map((color) => {
            const active = color.name === currentColor;
            const unavailable = !isColorAvailable(variants, color.name);
            return color.hex ? (
              <Pressable
                key={color.name}
                onPress={() => pick(currentSize, color.name)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active, disabled: unavailable }}
                accessibilityLabel={unavailable ? t('Color {name}, agotado', { name: color.name }) : t('Color {name}', { name: color.name })}
                style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: active ? colors.gold : 'transparent', opacity: unavailable ? 0.4 : 1 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: color.hex, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                  {active ? <Check size={14} color={isLight(color.hex) ? colors.black : colors.white} strokeWidth={3} /> : null}
                </View>
              </Pressable>
            ) : (
              <OptionChip key={color.name} label={color.name} active={active} unavailable={unavailable} onPress={() => pick(currentSize, color.name)} />
            );
          })}
        </Group>
      ) : null}

      {axes.sizes.length > 0 ? (
        <Group label={currentSize ? t('Talla: {size}', { size: currentSize }) : t('Talla')}>
          {axes.sizes.map((size) => (
            <OptionChip
              key={size}
              label={size}
              active={size === currentSize}
              unavailable={!isSizeAvailable(variants, size, axes.colors.length > 0 ? currentColor : null)}
              onPress={() => pick(size, currentColor)}
            />
          ))}
        </Group>
      ) : null}
    </View>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.xs }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>{children}</View>
    </View>
  );
}

function OptionChip({ label, active, unavailable, onPress }: { label: string; active: boolean; unavailable: boolean; onPress: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active, disabled: unavailable }}
      accessibilityLabel={unavailable ? t('{label}, agotado', { label }) : label}
      style={({ pressed }) => ({
        minWidth: 52,
        minHeight: 44,
        paddingHorizontal: spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: active ? colors.gold : colors.inputBorder,
        backgroundColor: active ? colors.goldWash : colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: unavailable ? 0.4 : pressed ? 0.7 : 1,
      })}>
      <AppText style={{ fontFamily: fontFamily.medium, fontSize: 15, color: active ? colors.foreground : colors.foreground, fontWeight: active ? '700' : '500', textDecorationLine: unavailable ? 'line-through' : 'none' }}>{label}</AppText>
    </Pressable>
  );
}

function isLight(hex: string): boolean {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.slice(0, 6);
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value)) return false;
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return r * 0.299 + g * 0.587 + b * 0.114 > 160;
}
