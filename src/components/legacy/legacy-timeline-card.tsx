import { LinearGradient } from 'expo-linear-gradient';
import { Camera, ChevronRight, Medal as MedalIcon, Shirt, Trophy } from 'lucide-react-native';
import { memo } from 'react';
import { Text, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PressScale } from '@/components/motion/press-scale';
import { plateStatusLabel } from '@/components/my-event-row';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';
import type { AthleteHistoryRow } from '@/types/models';
import { formatLongDate } from '@/utils/dates';

interface LegacyTimelineCardProps {
  row: AthleteHistoryRow;
  onPress: () => void;
  /** Home uses the same card for "tu última carrera" without the timeline rail. */
  compact?: boolean;
}

/**
 * One page of the athlete's story: the event, the day, and the number that
 * matters (official time) set big — like the engraving on a medal. Brushed
 * graphite + a ghosted year numeral instead of stock photography; opening
 * it goes to the full event story (result, media, gear, Legacy Plate, apoyo).
 */
export const LegacyTimelineCard = memo(function LegacyTimelineCard({ row, onPress, compact = false }: LegacyTimelineCardProps) {
  const { t } = useI18n();
  const year = row.event_date ? row.event_date.slice(0, 4) : '';
  const time = row.result?.official_time ?? null;
  const position = row.result?.overall_position ?? null;
  const plate = row.legacy_plate_status ? plateStatusLabel(row.legacy_plate_status, t) : null;

  return (
    <PressScale onPress={onPress} haptic scaleTo={0.98} accessibilityRole="button" accessibilityLabel={
        time
          ? t('{event}, tiempo oficial {time}. Ver la historia completa', { event: row.event ?? t('Evento'), time })
          : t('{event}. Ver la historia completa', { event: row.event ?? t('Evento') })
      }>
      <View style={{ borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden', borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.card, minHeight: compact ? 0 : 228 }}>
        <LinearGradient
          colors={[colors.card, colors.card, '#FBFAF6']}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {/* Brushed-steel sheen along the top edge. */}
        <LinearGradient
          colors={['rgba(201,174,139,0)', 'rgba(201,174,139,0.9)', 'rgba(201,174,139,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1 }}
        />
        {year ? (
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ position: 'absolute', right: -8, bottom: -24, fontFamily: fontFamily.headingBlack, fontSize: compact ? 96 : 132, color: 'rgba(11,11,12,0.04)', letterSpacing: -4 }}>
            {year}
          </Text>
        ) : null}

        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <AppText variant="eyebrow" style={{ flex: 1 }} numberOfLines={1}>
              {row.event_date ? formatLongDate(row.event_date).toUpperCase() : t('TU CARRERA')}
            </AppText>
            <ChevronRight size={18} color={colors.subtle} />
          </View>

          <View style={{ gap: 2 }}>
            <AppText variant="title" style={{ fontSize: compact ? 22 : 26, lineHeight: compact ? 27 : 31 }} numberOfLines={2}>
              {row.event ?? t('Evento')}
            </AppText>
            {[row.race, row.edition].filter(Boolean).length > 0 ? (
              <AppText variant="body" tone="muted" numberOfLines={1}>
                {[row.race, row.edition].filter(Boolean).join(' · ')}
              </AppText>
            ) : null}
          </View>

          {time ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.lg, marginTop: spacing.xs }}>
              <View>
                <Text style={{ fontFamily: fontFamily.heading, fontSize: compact ? 32 : 42, lineHeight: compact ? 36 : 46, color: colors.foreground, letterSpacing: -1 }}>{time}</Text>
                <AppText variant="label" tone="muted" style={{ letterSpacing: 1.5 }}>
                  {t('TIEMPO OFICIAL')}
                </AppText>
              </View>
              {position ? (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Trophy size={16} color={colors.accent} />
                    <Text style={{ fontFamily: fontFamily.heading, fontSize: 22, color: colors.foreground }}>{position}°</Text>
                  </View>
                  <AppText variant="label" tone="muted" style={{ letterSpacing: 1.5 }}>
                    {t('GENERAL')}
                  </AppText>
                </View>
              ) : null}
            </View>
          ) : (
            <AppText variant="caption" tone="muted">
              {t('Tu resultado aparecerá aquí en cuanto sea oficial.')}
            </AppText>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs }}>
            <Count icon={MedalIcon} count={row.medal_count} label={t('{count} medallas', { count: row.medal_count })} />
            <Count icon={Camera} count={row.media_count} label={t('{count} recuerdos', { count: row.media_count })} />
            <Count icon={Shirt} count={row.gear_count} label={t('{count} equipo', { count: row.gear_count })} />
            {plate ? <Badge label={`Legacy Plate · ${plate}`} variant="gold" /> : null}
          </View>
        </View>
      </View>
    </PressScale>
  );
});

function Count({ icon: Icon, count, label }: { icon: typeof MedalIcon; count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} accessibilityLabel={label}>
      <Icon color={colors.muted} size={15} />
      <AppText variant="caption" tone="muted">
        {count}
      </AppText>
    </View>
  );
}
