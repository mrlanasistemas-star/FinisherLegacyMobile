import { ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import type { FamilyPerson } from '@/api/family';
import { AppText } from '@/components/app-text';
import { PressableScale } from '@/components/motion/pressable-scale';
import { Avatar } from '@/components/ui/avatar';
import { colors, spacing } from '@/theme/tokens';

interface PersonRowProps {
  person: FamilyPerson | null;
  /** Shown instead of the name when there is no person yet (invite link). */
  fallbackName: string;
  caption?: string | null;
  trailing?: ReactNode;
  onPress?: () => void;
  divider?: boolean;
  accessibilityHint?: string;
}

/** A ListRow with an avatar — for the Familia lists (inside a ListGroup). */
export function PersonRow({ person, fallbackName, caption, trailing, onPress, divider = true, accessibilityHint }: PersonRowProps) {
  const name = person?.name ?? fallbackName;

  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 60 }}>
      <Avatar uri={person?.avatar_url} name={name} size={36} />
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          alignSelf: 'stretch',
          paddingVertical: spacing.sm,
          borderBottomWidth: divider ? 1 : 0,
          borderBottomColor: colors.hairline,
        }}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="body" numberOfLines={1}>
            {name}
          </AppText>
          {caption ? (
            <AppText variant="caption" tone="muted" numberOfLines={2}>
              {caption}
            </AppText>
          ) : null}
        </View>
        {trailing ?? (onPress ? <ChevronRight size={18} color={colors.subtle} /> : null)}
      </View>
    </View>
  );

  if (!onPress) return body;

  return (
    <PressableScale onPress={onPress} scaleTo={0.985} dim accessibilityRole="button" accessibilityLabel={caption ? `${name}, ${caption}` : name} accessibilityHint={accessibilityHint}>
      {body}
    </PressableScale>
  );
}
