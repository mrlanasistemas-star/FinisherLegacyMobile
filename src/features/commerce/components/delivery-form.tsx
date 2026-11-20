import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { FormInput } from '@/components/form-input';
import { useI18n } from '@/i18n';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';
import type { DeliveryOption } from '@/types/models';
import { formatMoney } from '@/utils/money';

import type { DeliveryChoice, DeliveryErrors, DeliveryField, DeliveryForm as DeliveryFormState } from '../delivery';

interface DeliveryFormProps {
  form: DeliveryFormState;
  options: DeliveryOption[];
  currency: string;
  errors: DeliveryErrors;
  onChange: (patch: Partial<DeliveryFormState>) => void;
}

/**
 * Checkout "Entrega": pickup or home delivery (each with the fee the server
 * prices), then the address when it ships. Fees come from the server; this
 * component never computes money.
 */
export function DeliveryForm({ form, options, currency, errors, onChange }: DeliveryFormProps) {
  const { t } = useI18n();
  const field = (name: DeliveryField) => ({
    value: form[name],
    error: errors[name],
    onChangeText: (value: string) => onChange({ [name]: value }),
  });

  return (
    <View style={{ gap: spacing.sm }}>
      <View accessibilityRole="radiogroup" style={{ gap: spacing.xs }}>
        {options.map((option) => (
          <MethodRow
            key={option.value}
            option={option}
            currency={currency}
            selected={form.method === option.value}
            onPress={() => onChange({ method: option.value as DeliveryChoice })}
          />
        ))}
      </View>

      {form.method === 'shipping' ? (
        <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
          <FormInput label={t('Calle y número')} kind="text" autoComplete="street-address" textContentType="fullStreetAddress" {...field('line')} />
          <FormInput label={t('Colonia (opcional)')} kind="text" {...field('neighborhood')} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <FormInput
              label={t('Código postal')}
              kind="number"
              maxLength={5}
              autoComplete="postal-code"
              textContentType="postalCode"
              containerStyle={{ flex: 1 }}
              {...field('postalCode')}
            />
            <FormInput label={t('Ciudad')} kind="text" textContentType="addressCity" containerStyle={{ flex: 1.4 }} {...field('city')} />
          </View>
          <FormInput label={t('Estado')} kind="text" textContentType="addressState" {...field('state')} />
          <FormInput label={t('Teléfono')} kind="phone" hint={t('Solo para coordinar la entrega.')} {...field('phone')} />
        </View>
      ) : null}

      <FormInput label={t('Notas para la entrega (opcional)')} kind="text" multiline maxLength={300} {...field('notes')} />
    </View>
  );
}

function MethodRow({ option, currency, selected, onPress }: { option: DeliveryOption; currency: string; selected: boolean; onPress: () => void }) {
  const { t } = useI18n();
  const shipping = option.value === 'shipping';
  const title = shipping ? t('Envío a domicilio') : t('Recoger en evento o punto de entrega');
  const price = option.fee_minor > 0 ? formatMoney(option.fee_minor, currency) : t('Sin costo');
  const detail = shipping
    ? option.free_over_minor !== null && option.fee_minor > 0
      ? t('Gratis desde {amount}. Te contactamos para coordinar la paquetería.', { amount: formatMoney(option.free_over_minor, currency) })
      : t('Te contactamos para coordinar la paquetería.')
    : t('Te avisamos cuando esté listo. Si tu compra es de un evento, la recibes en la entrega de kits.');

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}, ${price}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        padding: spacing.md,
        minHeight: 64,
        borderRadius: radius.md,
        borderCurve: 'continuous',
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? colors.foreground : colors.hairline,
        backgroundColor: colors.background,
        opacity: pressed ? 0.85 : 1,
      })}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          marginTop: 1,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: selected ? 0 : 1.5,
          borderColor: colors.border,
          backgroundColor: selected ? colors.foreground : 'transparent',
        }}>
        {selected ? <Check size={13} color={colors.background} strokeWidth={3} /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
          <AppText style={{ flex: 1, fontFamily: fontFamily.semibold, fontSize: 15 }}>{title}</AppText>
          <AppText style={{ fontFamily: fontFamily.medium, fontSize: 15 }}>{price}</AppText>
        </View>
        <AppText variant="caption" tone="muted">
          {detail}
        </AppText>
      </View>
    </Pressable>
  );
}
