/**
 * A story as a rich card: its cover edge to edge with the event, the date
 * and the title set over a scrim — or, with no photo yet, a carbon block
 * that invites to add the first one. Used by "Mis recuerdos" (the list)
 * and by the Recuerdos tab rail. Opens the story.
 */

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { ImagePlus, Images } from 'lucide-react-native';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/app-text';
import { GradientOverlay } from '@/components/brand/gradient-overlay';
import { PressableScale } from '@/components/motion/pressable-scale';
import type { StorySummary } from '@/schemas/iap';
import { gradients } from '@/theme/gradients';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme/tokens';
import { formatLongDate } from '@/utils/dates';

interface StoryCardProps {
  story: StorySummary;
  /** Fixed width for horizontal rails; full width otherwise. */
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function storyDateLabel(story: StorySummary): string | null {
  const date = story.event?.date;
  if (date && /^\d{4}-\d{2}-\d{2}/.test(date)) return formatLongDate(date.slice(0, 10));
  return story.year ? String(story.year) : null;
}

export function StoryCard({ story, width, height = 220, style }: StoryCardProps) {
  const title = story.title || story.event?.name || 'Mi recuerdo';
  const eventName = story.title && story.event?.name && story.event.name !== story.title ? story.event.name : null;
  const date = storyDateLabel(story);
  const photos = story.photos.length;
  const meta = [date, photos > 0 ? `${photos} ${photos === 1 ? 'foto' : 'fotos'}` : null].filter(Boolean).join('  ·  ');

  return (
    <PressableScale
      onPress={() => router.push(`/stories/${story.public_id}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={[title, eventName, date].filter(Boolean).join(', ')}
      accessibilityHint="Abre este recuerdo"
      style={[
        {
          width,
          height,
          borderRadius: radius.xl,
          borderCurve: 'continuous',
          backgroundColor: colors.black,
          ...shadows.card,
        },
        style,
      ]}>
      <View style={{ flex: 1, borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden', justifyContent: 'flex-end' }}>
        {story.cover_url ? (
          <>
            <Image
              source={{ uri: story.cover_url }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              contentFit="cover"
              transition={220}
              accessibilityIgnoresInvertColors
            />
            <GradientOverlay variant="bottom" />
          </>
        ) : (
          <>
            <LinearGradient colors={gradients.carbon} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
            <LinearGradient
              colors={gradients.goldGlow}
              start={{ x: 1, y: 0 }}
              end={{ x: 0.2, y: 0.8 }}
              style={{ position: 'absolute', top: 0, right: 0, width: '80%', height: '80%' }}
            />
            <View style={{ position: 'absolute', top: spacing.md, left: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ImagePlus size={15} color={colors.gold} strokeWidth={2} />
              <AppText maxFontSizeMultiplier={1.3} style={{ fontFamily: fontFamily.semibold, fontSize: 12.5, color: colors.goldSoft }}>
                Agrega tu primera foto
              </AppText>
            </View>
          </>
        )}

        <View style={{ padding: spacing.md, gap: 3 }}>
          {eventName ? (
            <AppText numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ fontFamily: fontFamily.bold, fontSize: 10.5, letterSpacing: 1.8, color: colors.goldSoft, textTransform: 'uppercase' }}>
              {eventName}
            </AppText>
          ) : null}
          <AppText numberOfLines={2} maxFontSizeMultiplier={1.3} style={{ fontFamily: fontFamily.heading, fontSize: width && width < 260 ? 18 : 22, lineHeight: width && width < 260 ? 23 : 27, letterSpacing: -0.3, color: colors.onDark }}>
            {title}
          </AppText>
          {meta ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
              {photos > 0 ? <Images size={13} color={colors.onDarkMuted} /> : null}
              <AppText numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ fontFamily: fontFamily.medium, fontSize: 13, color: colors.onDarkMuted }}>
                {meta}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}
