import { Pressable, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { AppText } from '@/components/app-text';

import { colors, spacing } from '@/theme/tokens';

interface SheetActionRowProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

export function SheetActionRow({ icon: Icon, label, onPress, destructive = false }: SheetActionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md }}
      accessibilityRole="button">
      <Icon color={destructive ? colors.destructive : colors.foreground} size={20} />
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong" tone={destructive ? 'destructive' : 'default'}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}
