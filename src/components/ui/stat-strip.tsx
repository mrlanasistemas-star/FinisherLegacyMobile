import { Fragment } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, fontFamily } from '@/theme/tokens';

export interface StatItem {
  label: string;
  value: number | string;
  onPress?: () => void;
}

/** Carreras · Medallas · Seguidores · Siguiendo — tappable when there's somewhere to go. */
export function StatStrip({ items }: { items: StatItem[] }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {items.map((item, index) => {
        const content = (
          <View style={{ alignItems: 'center', paddingVertical: 6 }}>
            <AppText style={{ fontFamily: fontFamily.bold, fontSize: 20, color: colors.foreground }}>{item.value}</AppText>
            <AppText variant="caption" tone="muted" numberOfLines={1} style={{ fontSize: 12 }}>
              {item.label}
            </AppText>
          </View>
        );

        return (
          <Fragment key={item.label}>
            {index > 0 ? <View style={{ width: 1, height: 28, backgroundColor: colors.hairline }} /> : null}
            {item.onPress ? (
              <Pressable
                onPress={item.onPress}
                accessibilityRole="button"
                accessibilityLabel={`${item.value} ${item.label}`}
                style={({ pressed }) => ({ flex: 1, minHeight: 44, opacity: pressed ? 0.6 : 1 })}>
                {content}
              </Pressable>
            ) : (
              <View style={{ flex: 1 }} accessible accessibilityLabel={`${item.value} ${item.label}`}>
                {content}
              </View>
            )}
          </Fragment>
        );
      })}
    </View>
  );
}
