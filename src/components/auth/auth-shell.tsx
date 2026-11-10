import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useRef, type ReactNode } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { useHeroActive } from '@/components/brand/hero/hero-motion';
import { MonogramSheen } from '@/components/brand/hero/monogram-sheen';
import { Reveal } from '@/components/motion/reveal';
import { IconButton } from '@/components/ui/icon-button';
import { useKeyboardInset, useRevealFocusedInput } from '@/hooks/use-keyboard-inset';
import { colors, spacing } from '@/theme/tokens';

interface AuthShellProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Pinned bottom area (primary CTA + secondary link) — always visible above the keyboard. */
  footer: ReactNode;
  /** Show a back button (defaults to true when there is somewhere to go back to). */
  back?: boolean;
}

/**
 * Light, editorial frame shared by login / register / forgot / reset:
 * FL monogram (original artwork, no glow), Montserrat title, Manrope body,
 * form in a scroll view and the CTA pinned at the bottom so it is never
 * pushed off-screen on short phones or by the keyboard.
 */
export function AuthShell({ eyebrow, title, subtitle, children, footer, back = true }: AuthShellProps) {
  const insets = useSafeAreaInsets();
  const canGoBack = back && router.canGoBack();
  const active = useHeroActive();
  // Footer rides on top of the keyboard (edge-to-edge: the window no longer
  // resizes) and otherwise clears the home indicator / Android nav bar.
  const keyboardHeight = useKeyboardInset();
  const scrollRef = useRef<ScrollView>(null);
  const onScroll = useRevealFocusedInput(scrollRef);
  const restingBottom = insets.bottom + spacing.md;
  const footerStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(restingBottom, keyboardHeight.value + spacing.sm),
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Fixed top bar: scrolled content never slides under the status bar. */}
      <View
        style={{
          paddingTop: spacing.xs,
          paddingHorizontal: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 52,
        }}>
        <View style={{ width: 44, marginLeft: -10 }}>
          {canGoBack ? <IconButton icon={ChevronLeft} label="Volver" onPress={() => router.back()} size={26} /> : null}
        </View>
        <MonogramSheen width={56} active={active} interval={4200} />
        <View style={{ width: 44 }} />
      </View>
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xl }}>

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.xs }}>
          {eyebrow ? (
            <Reveal>
              <AppText variant="eyebrow">{eyebrow}</AppText>
            </Reveal>
          ) : null}
          <Reveal delay={40}>
            <AppText variant="display" accessibilityRole="header" style={{ fontSize: 34, lineHeight: 39 }}>
              {title}
            </AppText>
          </Reveal>
          {subtitle ? (
            <Reveal delay={80}>
              <AppText variant="body" tone="muted" style={{ maxWidth: 360 }}>
                {subtitle}
              </AppText>
            </Reveal>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md, marginTop: spacing.xl }}>{children}</View>
      </ScrollView>

      <Animated.View
        style={[
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.hairline,
            gap: spacing.sm,
          },
          footerStyle,
        ]}>
        {footer}
      </Animated.View>
    </View>
  );
}

/** Inline form-level error banner (server/validation message), announced to screen readers. */
export function AuthFormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Reveal>
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={{ backgroundColor: colors.destructiveWash, borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
        <AppText variant="caption" tone="destructive">
          {message}
        </AppText>
      </View>
    </Reveal>
  );
}
