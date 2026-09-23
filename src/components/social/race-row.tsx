import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, fontFamily, spacing } from '@/theme/tokens';

const MONTH = new Intl.DateTimeFormat('es-MX', { month: 'short' });

interface RaceRowProps {
  event: string | null;
  race: string | null;
  date: string | null;
  time: string | null;
  pace?: string | null;
  onPress?: () => void;
}

/** One race in a list: date block · event + distance · official time. */
export function RaceRow({ event, race, date, time, pace, onPress }: RaceRowProps) {
  const [year, month, day] = (date ?? '').split('-').map(Number);
  const hasDate = !!year && !!month && !!day;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={[event, race, time].filter(Boolean).join(', ')}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.hairline,
        opacity: pressed ? 0.7 : 1,
      })}>
      <View style={{ width: 44, alignItems: 'center' }}>
        {hasDate ? (
          <>
            <AppText style={{ fontFamily: fontFamily.bold, fontSize: 20, lineHeight: 22 }}>{day}</AppText>
            <AppText variant="caption" tone="muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>
              {MONTH.format(new Date(year, month - 1, 1))} {String(year).slice(2)}
            </AppText>
          </>
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 15 }} numberOfLines={1}>
          {event ?? 'Carrera'}
        </AppText>
        {race ? (
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {race}
          </AppText>
        ) : null}
      </View>
      {time ? (
        <View style={{ alignItems: 'flex-end' }}>
          <AppText style={{ fontFamily: fontFamily.bold, fontSize: 16, color: colors.goldSoft }}>{time}</AppText>
          {pace ? (
            <AppText variant="caption" style={{ color: colors.subtle, fontSize: 12 }}>
              {pace}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}
