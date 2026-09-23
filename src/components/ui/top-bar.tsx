import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { IconButton } from '@/components/ui/icon-button';
import { spacing } from '@/theme/tokens';

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

/**
 * One header for every pushed screen: 44pt back target, centered title,
 * optional actions. Root tab screens use `root` + `large`.
 */
export function TopBar({ title, right, root = false, onBack, large = false }: TopBarProps) {
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, gap: spacing.xxs }}>
        <View style={{ width: 88, flexDirection: 'row', alignItems: 'center', marginLeft: -10 }}>
          {!root ? <IconButton icon={ChevronLeft} label="Volver" onPress={goBack} size={26} /> : null}
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
