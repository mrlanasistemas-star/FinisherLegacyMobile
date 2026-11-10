/**
 * The race, set like a results sheet: the athlete and bib on top, the
 * finish time as the one big numeral, then a quiet grid with pace,
 * distance, overall / category / gender position and category. Only
 * values that exist are shown — an empty cell is never invented. Fields
 * the event published itself carry a discreet "Oficial" mark.
 */

import { BadgeCheck } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import type { EditableStory, StoryTextField } from '@/schemas/story';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme/tokens';

interface Cell {
  field: StoryTextField;
  label: string;
  value: string;
}

function ordinal(value: string | null): string | null {
  if (!value) return null;
  return /^\d+$/.test(value) ? `${value}.º` : value;
}

function cells(story: EditableStory): Cell[] {
  const candidates: (Cell | { field: StoryTextField; label: string; value: null })[] = [
    { field: 'pace', label: 'Ritmo', value: story.pace },
    { field: 'distance', label: 'Distancia', value: story.distance },
    { field: 'result_position', label: 'Posición general', value: ordinal(story.result_position) },
    { field: 'category', label: 'Categoría', value: story.category },
    { field: 'category_position', label: 'Posición en categoría', value: ordinal(story.category_position) },
    { field: 'gender_position', label: 'Posición por rama', value: ordinal(story.gender_position) },
  ];
  return candidates.filter((cell): cell is Cell => !!cell.value);
}

export function hasRaceData(story: EditableStory): boolean {
  return !!(story.result_time || story.bib_number || story.athlete_display_name || cells(story).length > 0);
}

function OfficialMark() {
  return (
    <View accessible accessibilityLabel="Dato oficial" style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <BadgeCheck size={13} color={colors.accent} strokeWidth={2.1} />
      <AppText maxFontSizeMultiplier={1.2} style={{ fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 1, color: colors.accent, textTransform: 'uppercase' }}>
        Oficial
      </AppText>
    </View>
  );
}

export function RaceDataCard({ story }: { story: EditableStory }) {
  const grid = cells(story);
  const official = (field: StoryTextField) => story.official[field] === true;
  const anyOfficial = Object.keys(story.official).length > 0;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: colors.hairline,
        overflow: 'hidden',
        ...shadows.card,
      }}>
      {story.athlete_display_name || story.bib_number ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <View style={{ flex: 1 }}>
            {story.athlete_display_name ? (
              <AppText numberOfLines={2} style={{ fontFamily: fontFamily.headingSemibold, fontSize: 18, lineHeight: 23, color: colors.foreground }}>
                {story.athlete_display_name}
              </AppText>
            ) : null}
          </View>
          {story.bib_number ? (
            <View
              accessible
              accessibilityLabel={`Dorsal ${story.bib_number}`}
              style={{ alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderCurve: 'continuous', backgroundColor: colors.black, minWidth: 64 }}>
              <AppText maxFontSizeMultiplier={1.2} style={{ fontFamily: fontFamily.bold, fontSize: 8.5, letterSpacing: 1.6, color: colors.gold, textTransform: 'uppercase' }}>
                Dorsal
              </AppText>
              <AppText maxFontSizeMultiplier={1.2} style={{ fontFamily: fontFamily.headingBlack, fontSize: 18, lineHeight: 22, color: colors.onDark, fontVariant: ['tabular-nums'] }}>
                {story.bib_number}
              </AppText>
            </View>
          ) : null}
        </View>
      ) : null}

      {story.result_time ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <AppText variant="eyebrow" tone="subtle">
              Tiempo
            </AppText>
            {official('result_time') ? <OfficialMark /> : null}
          </View>
          <AppText
            adjustsFontSizeToFit
            numberOfLines={1}
            maxFontSizeMultiplier={1.15}
            accessibilityLabel={`Tiempo ${story.result_time}`}
            style={{ fontFamily: fontFamily.headingBlack, fontSize: 52, lineHeight: 58, letterSpacing: -1.5, color: colors.foreground, fontVariant: ['tabular-nums'] }}>
            {story.result_time}
          </AppText>
        </View>
      ) : null}

      {grid.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.hairline }}>
          {grid.map((cell, index) => {
            const lastRowStart = grid.length - (grid.length % 2 === 0 ? 2 : 1);
            return (
              <View
                key={cell.field}
                accessible
                accessibilityLabel={`${cell.label}: ${cell.value}${official(cell.field) ? ', dato oficial' : ''}`}
                style={{
                  width: grid.length % 2 === 1 && index === grid.length - 1 ? '100%' : '50%',
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.sm + 2,
                  borderRightWidth: index % 2 === 0 && !(grid.length % 2 === 1 && index === grid.length - 1) ? 1 : 0,
                  borderRightColor: colors.hairline,
                  borderBottomWidth: index < lastRowStart ? 1 : 0,
                  borderBottomColor: colors.hairline,
                  gap: 2,
                }}>
                <AppText maxFontSizeMultiplier={1.3} style={{ fontFamily: fontFamily.medium, fontSize: 12, color: colors.subtle }}>
                  {cell.label}
                </AppText>
                <AppText numberOfLines={2} style={{ fontFamily: fontFamily.headingSemibold, fontSize: 17, lineHeight: 22, color: colors.foreground, fontVariant: ['tabular-nums'] }}>
                  {cell.value}
                </AppText>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={{ height: spacing.lg }} />
      )}

      {anyOfficial ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.hairline }}>
          <BadgeCheck size={14} color={colors.accent} strokeWidth={2} />
          <AppText variant="caption" tone="subtle" style={{ flex: 1, fontSize: 12.5 }}>
            Resultado oficial publicado por el evento.
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
