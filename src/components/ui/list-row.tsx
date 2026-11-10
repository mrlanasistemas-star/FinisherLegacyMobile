import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Children, isValidElement, type ReactNode } from 'react';
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/app-text';
import { PressableScale } from '@/components/motion/pressable-scale';
import { colors, radius, shadows, spacing } from '@/theme/tokens';

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
  /** Hairline under the row (grouped lists). Inside a ListGroup the last row's divider is dropped automatically. */
  divider?: boolean;
}

/**
 * The one "row" of the app — settings, menus, pickers. Icon sits in a soft
 * tinted rounded square (iOS Settings), hairline inset from the text.
 */
export function ListRow({ label, description, value, icon: Icon, onPress, destructive, loading, trailing, divider = true }: ListRowProps) {
  const tint = destructive ? colors.destructive : colors.foreground;

  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 52 }}>
      {Icon ? (
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            borderCurve: 'continuous',
            backgroundColor: destructive ? colors.destructiveWash : colors.goldWash,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon size={18} color={destructive ? colors.destructive : colors.accent} strokeWidth={1.9} />
        </View>
      ) : null}
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          alignSelf: 'stretch',
          paddingVertical: spacing.sm,
          borderBottomWidth: divider ? 1 : 0,
          borderBottomColor: colors.hairline,
        }}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="body" style={{ color: tint, fontWeight: destructive ? '600' : undefined }}>
            {label}
          </AppText>
          {description ? (
            <AppText variant="caption" tone="muted">
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
          <ActivityIndicator color={colors.accent} size="small" />
        ) : trailing ? (
          trailing
        ) : onPress ? (
          <ChevronRight size={18} color={colors.subtle} />
        ) : null}
      </View>
    </View>
  );

  if (!onPress) return body;

  return (
    <PressableScale
      onPress={loading ? undefined : onPress}
      scaleTo={0.985}
      dim
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={description ?? undefined}>
      {body}
    </PressableScale>
  );
}

interface ListGroupProps {
  /** Small uppercase caption above the group. */
  title?: string;
  /** Footnote under the group. */
  footer?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Grouped inset section (iOS Settings): white rounded card, hairline
 * dividers between rows, the last row never shows a divider.
 */
export function ListGroup({ title, footer, children, style }: ListGroupProps) {
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={style}>
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
          paddingLeft: spacing.md,
          paddingRight: spacing.sm,
          borderWidth: 1,
          borderColor: colors.hairline,
          ...shadows.soft,
        }}>
        {items.map((child, index) =>
          isValidElement<ListRowProps>(child) && child.type === ListRow && index === items.length - 1
            ? { ...child, props: { ...child.props, divider: false } }
            : child,
        )}
      </View>
      {footer ? (
        <AppText variant="caption" tone="subtle" style={{ marginTop: spacing.xs, marginHorizontal: spacing.md }}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}
