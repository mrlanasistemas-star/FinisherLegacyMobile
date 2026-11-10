import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactElement, ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, View, type RefreshControlProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { PressableScale } from '@/components/motion/pressable-scale';
import { Reveal } from '@/components/motion/reveal';
import { ScrollHeader, useScrollY } from '@/components/motion/scroll-header';
import { IconButton } from '@/components/ui/icon-button';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import { useI18n } from '@/i18n';

interface TopBarProps {
  title?: string;
  /** Right-side actions (IconButtons). */
  right?: ReactNode;
  /** Hide the back button (root tab screens). */
  root?: boolean;
  onBack?: () => void;
  /** Large editorial title below the bar instead of centered. */
  large?: boolean;
}

function defaultBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * One header for every pushed screen: 44pt back target, centered title,
 * optional actions. Root tab screens use `root` + `large`.
 */
export function TopBar({ title, right, root = false, onBack, large = false }: TopBarProps) {
  const { t } = useI18n();
  const goBack = onBack ?? defaultBack;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, gap: spacing.xxs }}>
        <View style={{ width: 88, flexDirection: 'row', alignItems: 'center', marginLeft: -10 }}>
          {!root ? <IconButton icon={ChevronLeft} label={t('Volver')} onPress={goBack} size={26} /> : null}
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          {title && !large ? (
            <AppText variant="bodyStrong" numberOfLines={1} accessibilityRole="header">
              {title}
            </AppText>
          ) : null}
        </View>
        <View style={{ width: 88, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginRight: -10 }}>{right}</View>
      </View>
      {title && large ? (
        <AppText variant="title" accessibilityRole="header" style={{ marginTop: spacing.xxs, marginBottom: spacing.sm }}>
          {title}
        </AppText>
      ) : null}
    </View>
  );
}

interface LargeTitleScrollProps {
  title: string;
  /** Optional line under the large title. */
  subtitle?: string;
  children: ReactNode;
  right?: ReactNode;
  /** Hide the back button (root screens). */
  root?: boolean;
  onBack?: () => void;
  refreshControl?: ReactElement<RefreshControlProps>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Wrap in a KeyboardAvoidingView (forms). */
  keyboard?: boolean;
}

const NAV_HEIGHT = 52;

/**
 * iOS large-title page: the title sits big under a transparent bar and
 * collapses into a frosted nav bar with a small centered title as you
 * scroll (UI-thread interpolation). Bottom padding clears the home
 * indicator / Android navigation bar.
 */
export function LargeTitleScroll({
  title,
  subtitle,
  children,
  right,
  root = false,
  onBack,
  refreshControl,
  contentContainerStyle,
  keyboard = false,
}: LargeTitleScrollProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { scrollY, onScroll } = useScrollY();
  const goBack = onBack ?? defaultBack;

  const scroll = (
    <Animated.ScrollView
      onScroll={onScroll}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      contentContainerStyle={[
        { paddingTop: insets.top + NAV_HEIGHT, paddingHorizontal: spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        contentContainerStyle,
      ]}>
      <Reveal style={{ paddingHorizontal: spacing.xs, marginBottom: spacing.lg, gap: 4 }}>
        <AppText variant="display" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="body" tone="muted">
            {subtitle}
          </AppText>
        ) : null}
      </Reveal>
      {children}
    </Animated.ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {keyboard ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {scroll}
        </KeyboardAvoidingView>
      ) : (
        scroll
      )}
      <ScrollHeader
        scrollY={scrollY}
        title={title}
        threshold={56}
        left={!root ? <IconButton icon={ChevronLeft} label={t('Volver')} onPress={goBack} size={26} /> : null}
        right={right}
      />
    </View>
  );
}

interface HeaderTextButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * iOS-style text action for a header ("Guardar", "Listo"): bold accent text,
 * muted while disabled, a spinner while saving — never a chunky filled pill.
 */
export function HeaderTextButton({ label, onPress, disabled = false, loading = false }: HeaderTextButtonProps) {
  const inactive = disabled || loading;
  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      scaleTo={0.94}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={{ minHeight: 44, minWidth: 44, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' }}>
      {loading ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : (
        <AppText maxFontSizeMultiplier={1.3} style={{ fontFamily: fontFamily.bold, fontSize: 16, color: inactive ? colors.subtle : colors.accent }}>
          {label}
        </AppText>
      )}
    </PressableScale>
  );
}
