import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText } from './app-text';

import { colors, spacing } from '@/theme/tokens';

export function ScreenHeader({ title }: { title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.sm }}>
      <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Volver">
        <ChevronLeft color={colors.foreground} size={26} />
      </Pressable>
      <AppText variant="subtitle">{title}</AppText>
    </View>
  );
}
