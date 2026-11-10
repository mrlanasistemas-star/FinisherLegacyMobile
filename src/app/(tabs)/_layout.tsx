import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Tabs, type Href } from 'expo-router';
import { BookHeart, Home, Nfc, ShoppingBag, Users, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { localeScreenLayout } from '@/components/i18n/locale-boundary';
import { PressableScale } from '@/components/motion/pressable-scale';
import { MiniPlayer } from '@/features/training/components/mini-player';
import { useCartCount } from '@/hooks/use-cart';
import { useI18n, type Translate } from '@/i18n';
import { gradients } from '@/theme/gradients';
import { colors, fontFamily, springs } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

/**
 * Navigation (D1 restructure):
 *   Inicio · Recuerdos · [ACTIVAR] · Comunidad · Colecciones
 *
 * - The center slot is not a tab: it is the product's main action — tap your
 *   NFC piece — and pushes `/activate`.
 * - Recuerdos = your legacy (races, memories, gear) — the old "Legado" tab.
 * - Comunidad = feed, athletes, events — the old "Explorar" tab.
 * - Colecciones = the store catalog (cart badge lives here).
 * - Perfil stays a real route (`/profile`) but leaves the bar; it is one tap
 *   away from the avatar in every root header.
 */
const ACTIVATE_HREF = '/activate' as Href;

/** Built with the hook's `t`: the bar lives outside the screens, so it must follow the language by itself. */
function buildTabs(t: Translate): Record<string, { label: string; icon: LucideIcon; a11y: string }> {
  return {
    index: { label: t('Inicio'), icon: Home, a11y: t('Inicio') },
    legacy: { label: t('Recuerdos'), icon: BookHeart, a11y: t('Mis recuerdos: tus carreras, fotos y equipo') },
    explore: { label: t('Comunidad'), icon: Users, a11y: t('Comunidad: atletas, momentos y eventos') },
    store: { label: t('Colecciones'), icon: ShoppingBag, a11y: t('Colecciones: tienda Finisher Legacy') },
  };
}
/** Bar order; `null` = the center Activar action. */
const ORDER: (string | null)[] = ['index', 'legacy', null, 'explore', 'store'];

const BAR_HEIGHT = 62;

export default function TabsLayout() {
  const { t } = useI18n();

  return (
    <Tabs tabBar={(props) => <BrandTabBar {...props} />} screenLayout={localeScreenLayout} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: t('Inicio') }} />
      <Tabs.Screen name="legacy" options={{ title: t('Recuerdos') }} />
      <Tabs.Screen name="explore" options={{ title: t('Comunidad') }} />
      <Tabs.Screen name="store" options={{ title: t('Colecciones') }} />
      <Tabs.Screen name="profile" options={{ title: t('Perfil') }} />
    </Tabs>
  );
}

function BrandTabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useI18n();
  const tabs = buildTabs(t);
  const insets = useSafeAreaInsets();
  const cartCount = useCartCount();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const slot = width / ORDER.length;

  const activeName = state.routes[state.index]?.name;
  const activeSlot = ORDER.indexOf(activeName ?? '');
  const indicatorX = useSharedValue(-1);
  const indicatorOpacity = useSharedValue(0);

  useEffect(() => {
    if (!slot) return;
    const target = activeSlot >= 0 ? activeSlot * slot : indicatorX.value;
    indicatorX.value = reduceMotion || indicatorX.value < 0 ? target : withSpring(target, springs.snappy);
    indicatorOpacity.value = withTiming(activeSlot >= 0 ? 1 : 0, { duration: 160 });
  }, [activeSlot, slot, reduceMotion, indicatorX, indicatorOpacity]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorOpacity.value,
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View style={{ backgroundColor: colors.background }}>
      {/* Entrenamientos "now playing" bar — renders nothing when idle. */}
      <MiniPlayer style={{ paddingTop: 6 }} />
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={{
          backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.97)' : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.hairline,
          paddingBottom: Math.max(insets.bottom, 8),
          shadowColor: '#2B2418',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
        }}>
        {slot ? (
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, width: slot, alignItems: 'center' }, indicatorStyle]}>
            <View style={{ width: 28, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: colors.gold }} />
          </Animated.View>
        ) : null}
        <View style={{ flexDirection: 'row', height: BAR_HEIGHT, alignItems: 'center' }}>
          {ORDER.map((name) => {
            if (name === null) return <ActivateButton key="activate" />;
            const route = state.routes.find((r) => r.name === name);
            if (!route) return null;
            const focused = activeName === name;
            const meta = tabs[name];
            const badge = name === 'store' && cartCount > 0 ? (cartCount > 99 ? '99+' : String(cartCount)) : null;
            return (
              <TabItem
                key={name}
                label={meta.label}
                icon={meta.icon}
                focused={focused}
                badge={badge}
                accessibilityLabel={badge ? t('{label}, {count} en el carrito', { label: meta.a11y, count: badge }) : meta.a11y}
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  haptics.selection();
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
                }}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

interface TabItemProps {
  label: string;
  icon: LucideIcon;
  focused: boolean;
  badge: string | null;
  accessibilityLabel: string;
  onPress: () => void;
  onLongPress: () => void;
}

function TabItem({ label, icon: Icon, focused, badge, accessibilityLabel, onPress, onLongPress }: TabItemProps) {
  const reduceMotion = useReducedMotion();
  const active = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    active.value = reduceMotion ? (focused ? 1 : 0) : withSpring(focused ? 1 : 0, springs.snappy);
  }, [focused, active, reduceMotion]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(active.value, [0, 1], [0, -1]) }, { scale: interpolate(active.value, [0, 1], [1, 1.08]) }],
  }));

  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      scaleTo={0.9}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, gap: 3 }}>
      <Animated.View style={iconStyle}>
        <Icon size={23} color={focused ? colors.foreground : colors.subtle} strokeWidth={focused ? 2.3 : 1.8} />
        {badge ? (
          <View
            style={{
              position: 'absolute',
              top: -5,
              right: -10,
              minWidth: 18,
              height: 18,
              paddingHorizontal: 4,
              borderRadius: 9,
              backgroundColor: colors.gold,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: colors.card,
            }}>
            <AppText style={{ fontFamily: fontFamily.bold, fontSize: 10, color: colors.onGold }} maxFontSizeMultiplier={1.2}>
              {badge}
            </AppText>
          </View>
        ) : null}
      </Animated.View>
      <AppText
        maxFontSizeMultiplier={1.2}
        numberOfLines={1}
        style={{ fontFamily: focused ? fontFamily.bold : fontFamily.medium, fontSize: 10.5, color: focused ? colors.foreground : colors.subtle }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

/**
 * Raised carbon medallion with a gold NFC glyph and a slow "breathing" gold
 * ring — the one action the whole product is built around.
 */
function ActivateButton() {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const breathe = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    breathe.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [breathe, reduceMotion]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breathe.value, [0, 1], [0.25, 0.7]),
    transform: [{ scale: interpolate(breathe.value, [0, 1], [1, 1.12]) }],
  }));

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Pressable
        onPress={() => {
          haptics.light();
          router.push(ACTIVATE_HREF);
        }}
        accessibilityRole="button"
        accessibilityLabel={t('Activar mi Finisher Legacy')}
        accessibilityHint={t('Acerca tu pieza con NFC para activarla')}
        hitSlop={6}
        style={{ alignItems: 'center', marginTop: -22 }}>
        {({ pressed }) => (
          <>
            <View style={{ width: 58, height: 58, alignItems: 'center', justifyContent: 'center' }}>
              <Animated.View
                pointerEvents="none"
                style={[{ position: 'absolute', width: 58, height: 58, borderRadius: 29, borderWidth: 1.5, borderColor: colors.gold }, ringStyle]}
              />
              <LinearGradient
                colors={gradients.carbon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: colors.goldDim,
                  transform: [{ scale: pressed && !reduceMotion ? 0.92 : 1 }],
                }}>
                <Nfc size={24} color={colors.gold} strokeWidth={2} />
              </LinearGradient>
            </View>
            <AppText maxFontSizeMultiplier={1.2} style={{ fontFamily: fontFamily.bold, fontSize: 10.5, color: colors.accent, marginTop: 3 }}>
              {t('Activar')}
            </AppText>
          </>
        )}
      </Pressable>
    </View>
  );
}
