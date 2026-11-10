/**
 * Rows of the story editor's grouped form (iOS Settings style): the label
 * on the left, the value typed on the right, a hairline between rows and
 * the error — if any — right under its row. A field the event published
 * officially is shown read-only with a lock and an "Oficial" mark instead
 * of an input. `FormArea` is the multiline variant (dedication, story)
 * with a live character count.
 */

import { BadgeCheck, Lock } from 'lucide-react-native';
import { forwardRef, type ReactNode } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme/tokens';

export function FormGroup({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  return (
    <View>
      {title ? (
        <AppText variant="eyebrow" tone="subtle" style={{ marginBottom: spacing.xs, marginLeft: spacing.md }}>
          {title}
        </AppText>
      ) : null}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: colors.hairline,
          paddingLeft: spacing.md,
          ...shadows.soft,
        }}>
        {children}
      </View>
      {footer ? (
        <AppText variant="caption" tone="subtle" style={{ marginTop: spacing.xs, marginHorizontal: spacing.md, fontSize: 13 }}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

function OfficialBadge() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.goldWash }}>
      <BadgeCheck size={12} color={colors.accent} strokeWidth={2.2} />
      <AppText maxFontSizeMultiplier={1.2} style={{ fontFamily: fontFamily.bold, fontSize: 10.5, letterSpacing: 0.6, color: colors.accent }}>
        Oficial
      </AppText>
    </View>
  );
}

interface FormRowProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  /** Read-only, published by the event. */
  official?: boolean;
  /** No hairline (last row of a group). */
  last?: boolean;
}

export const FormRow = forwardRef<TextInput, FormRowProps>(function FormRow({ label, error, official = false, last = false, value, ...input }, ref) {
  return (
    <View style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.hairline, paddingRight: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 50, gap: spacing.sm }}>
        <AppText maxFontSizeMultiplier={1.4} style={{ fontFamily: fontFamily.medium, fontSize: 15, color: error ? colors.destructive : colors.foreground, width: '38%' }}>
          {label}
        </AppText>
        {official ? (
          <View
            accessible
            accessibilityLabel={`${label}: ${value || 'sin dato'}. Dato oficial, no se puede editar.`}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.xs, paddingVertical: spacing.sm }}>
            <AppText numberOfLines={2} style={{ flexShrink: 1, fontFamily: fontFamily.regular, fontSize: 16, color: colors.muted, textAlign: 'right' }}>
              {value || '—'}
            </AppText>
            <OfficialBadge />
            <Lock size={13} color={colors.subtle} />
          </View>
        ) : (
          <TextInput
            ref={ref}
            value={value}
            accessibilityLabel={label}
            accessibilityHint={error}
            placeholderTextColor={colors.subtle}
            selectionColor={colors.accent}
            cursorColor={colors.accent}
            returnKeyType="next"
            {...input}
            style={{
              flex: 1,
              minHeight: 50,
              paddingVertical: 0,
              fontFamily: fontFamily.regular,
              fontSize: 16,
              color: colors.foreground,
              textAlign: 'right',
            }}
          />
        )}
      </View>
      {error ? (
        <AppText accessibilityLiveRegion="polite" style={{ fontFamily: fontFamily.regular, fontSize: 13, color: colors.destructive, paddingBottom: spacing.xs, textAlign: 'right' }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
});

interface FormAreaProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  official?: boolean;
  maxLength: number;
  minHeight?: number;
}

export const FormArea = forwardRef<TextInput, FormAreaProps>(function FormArea({ label, error, official = false, maxLength, minHeight = 120, value = '', ...input }, ref) {
  const length = value.length;
  const near = length > maxLength * 0.9;

  return (
    <View style={{ paddingRight: spacing.md, paddingVertical: spacing.sm }}>
      {official ? (
        <View accessible accessibilityLabel={`${label}. Dato oficial, no se puede editar.`} style={{ gap: spacing.xs }}>
          <AppText style={{ fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24, color: colors.muted }}>{value || '—'}</AppText>
          <OfficialBadge />
        </View>
      ) : (
        <TextInput
          ref={ref}
          value={value}
          multiline
          scrollEnabled={false}
          accessibilityLabel={label}
          accessibilityHint={error}
          placeholderTextColor={colors.subtle}
          selectionColor={colors.accent}
          cursorColor={colors.accent}
          {...input}
          style={{
            minHeight,
            padding: 0,
            fontFamily: fontFamily.regular,
            fontSize: 16,
            lineHeight: 24,
            color: colors.foreground,
            textAlignVertical: 'top',
          }}
        />
      )}
      {!official ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.xs }}>
          <AppText accessibilityLiveRegion="polite" style={{ flex: 1, fontFamily: fontFamily.regular, fontSize: 13, color: colors.destructive }}>
            {error ?? ''}
          </AppText>
          <AppText
            accessibilityLabel={`${length} de ${maxLength} caracteres`}
            style={{ fontFamily: fontFamily.medium, fontSize: 12, color: length > maxLength ? colors.destructive : near ? colors.accent : colors.subtle, fontVariant: ['tabular-nums'] }}>
            {length}/{maxLength}
          </AppText>
        </View>
      ) : null}
    </View>
  );
});
