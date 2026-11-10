import type { LucideIcon } from 'lucide-react-native';
import { useEffect, useRef, type PropsWithChildren, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { useKeyboardInset, useRevealFocusedInput } from '@/hooks/use-keyboard-inset';
import { colors, radius, spacing } from '@/theme/tokens';

interface ShellProps extends PropsWithChildren {
  /** Header leading action (close or back). */
  leading?: { icon: LucideIcon; label: string; onPress: () => void };
  title?: string;
  /** Rendered under the header (progress indicator). */
  progress?: ReactNode;
  /** Bottom CTAs — pinned above the home indicator / Android nav bar / keyboard. */
  footer?: ReactNode;
  /** Changing it replays the sheet's entering spring (one per step). */
  stepKey: string;
}

/**
 * Light, sheet-style frame for every activation step: compact header,
 * progress, a scrollable white sheet that springs in per step, and a
 * footer that always clears the safe area — and rides above the keyboard
 * (JS keyboard events → UI-thread animation; robust on Android edge-to-edge).
 */
export function ActivationShell({ leading, title, progress, footer, stepKey, children }: ShellProps) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardInset();
  const scrollRef = useRef<ScrollView>(null);
  const onScroll = useRevealFocusedInput(scrollRef);
  // Every step starts at its top (the previous one may have been scrolled for the keyboard).
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [stepKey]);
  // Breathing room above the home indicator / Android nav bar, never flush against it.
  const bottomInset = insets.bottom + spacing.sm;

  const footerStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(bottomInset, keyboardHeight.value + spacing.sm),
  }));

  const Leading = leading?.icon;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={styles.header}>
        {leading && Leading ? (
          <Pressable onPress={leading.onPress} accessibilityRole="button" accessibilityLabel={leading.label} hitSlop={8} style={styles.leading}>
            <Leading size={22} color={colors.foreground} strokeWidth={1.8} />
          </Pressable>
        ) : (
          <View style={styles.leading} />
        )}
        {title ? (
          <AppText variant="bodyStrong" style={styles.title} accessibilityRole="header" numberOfLines={1}>
            {title}
          </AppText>
        ) : null}
        <View style={styles.leading} />
      </View>

      {progress ? <View style={styles.progress}>{progress}</View> : null}

      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}>
        <Animated.View key={stepKey} entering={FadeInDown.springify().damping(20).stiffness(180)} exiting={FadeOut.duration(120)} style={styles.sheet}>
          {children}
        </Animated.View>
      </ScrollView>

      {footer ? (
        <Animated.View entering={FadeIn.duration(200)} style={[styles.footer, footerStyle]}>
          {footer}
        </Animated.View>
      ) : (
        <View style={{ height: bottomInset }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  leading: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center' },
  progress: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.lg },
  sheet: {
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
    shadowColor: '#2B2418',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 1,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
});
