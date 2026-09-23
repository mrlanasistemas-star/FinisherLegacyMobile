import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, spacing } from '@/theme/tokens';

interface ListRowProps {
  label: string;
  /** Secondary line under the label. */
  description?: string | null;
  /** Right-aligned value (e.g. "Cuernavaca, Morelos"). */
  value?: string | null;
  icon?: LucideIcon;
  onPress?: () => void;
  destructive?: boolean;
  loading?: boolean;
  /** Replaces the chevron (e.g. a Switch). */
  trailing?: ReactNode;
  /** Hairline under the row (grouped lists). */
  divider?: boolean;
}

/**
 * The one "row" of the app — settings, menus, pickers. Flat, full-bleed,
 * hairline-divided; never a stack of boxed cards.
 */
export function ListRow({ label, description, value, icon: Icon, onPress, destructive, loading, trailing, divider = true }: ListRowProps) {
  const tint = destructive ? colors.destructive : colors.foreground;

  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: 52,
        paddingVertical: spacing.sm,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: colors.hairline,
      }}>
      {Icon ? <Icon size={20} color={destructive ? colors.destructive : colors.muted} strokeWidth={1.8} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong" style={{ color: tint }}>
          {label}
        </AppText>
        {description ? (
          <AppText variant="caption" tone="muted" numberOfLines={2}>
            {description}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="caption" tone="muted" numberOfLines={1} style={{ maxWidth: '45%' }}>
          {value}
        </AppText>
      ) : null}
      {loading ? (
        <ActivityIndicator color={colors.gold} size="small" />
      ) : trailing ? (
        trailing
      ) : onPress ? (
        <ChevronRight size={18} color={colors.subtle} />
      ) : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={loading ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={description ?? undefined}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {body}
    </Pressable>
  );
}
