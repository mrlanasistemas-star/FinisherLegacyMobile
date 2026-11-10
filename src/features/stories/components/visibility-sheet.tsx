/**
 * Who can open the story: Privado / Con enlace / Público, as an iOS
 * segmented control in a bottom sheet. The choice is saved at once
 * (`PATCH /me/stories/{id}`); the control follows the finger immediately
 * and returns to the saved value if the server rejects it.
 */

import { Globe, Link2, Lock, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AppError } from '@/api/errors';
import { AppText } from '@/components/app-text';
import { InlineError } from '@/components/ui/inline-error';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Sheet } from '@/components/ui/sheet';
import type { StoryVisibility } from '@/schemas/story';
import { colors, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

import { useUpdateStory } from '../use-stories';

export const VISIBILITY_COPY: Record<StoryVisibility, { label: string; icon: LucideIcon; title: string; description: string }> = {
  private: {
    label: 'Privado',
    icon: Lock,
    title: 'Solo tú',
    description: 'Nadie más puede abrir este recuerdo, ni con el enlace ni acercando tu Finisher Legacy Tag.',
  },
  unlisted: {
    label: 'Con enlace',
    icon: Link2,
    title: 'Solo con el enlace o tu Tag',
    description: 'Lo ve quien reciba tu enlace o acerque tu Finisher Legacy Tag a su teléfono. No aparece en tu perfil.',
  },
  public: {
    label: 'Público',
    icon: Globe,
    title: 'Cualquiera',
    description: 'Cualquier persona puede verlo y aparece en tu perfil público.',
  },
};

const OPTIONS = (['private', 'unlisted', 'public'] as const).map((value) => ({ value, label: VISIBILITY_COPY[value].label }));

interface VisibilitySheetProps {
  visible: boolean;
  onClose: () => void;
  publicId: string;
  value: StoryVisibility;
}

export function VisibilitySheet({ visible, onClose, publicId, value }: VisibilitySheetProps) {
  const update = useUpdateStory(publicId);
  const [optimistic, setOptimistic] = useState<StoryVisibility | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = optimistic ?? value;
  const copy = VISIBILITY_COPY[current];
  const Icon = copy.icon;

  function choose(next: StoryVisibility) {
    if (next === current || update.isPending) return;
    setError(null);
    setOptimistic(next);
    update.mutate(
      { visibility: next },
      {
        onSuccess: () => {
          setOptimistic(null);
          haptics.success();
        },
        onError: (caught) => {
          setOptimistic(null);
          setError(caught instanceof AppError && caught.kind !== 'not_found' ? caught.message : 'No pudimos guardar el cambio. Intenta de nuevo.');
        },
      },
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: spacing.md, paddingBottom: spacing.xs }}>
        <View style={{ gap: 2 }}>
          <AppText variant="subtitle" accessibilityRole="header">
            ¿Quién puede verlo?
          </AppText>
          <AppText variant="caption" tone="muted">
            Puedes cambiarlo cuando quieras.
          </AppText>
        </View>

        <SegmentedControl options={OPTIONS} value={current} onChange={choose} />

        <View
          accessibilityLiveRegion="polite"
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            padding: spacing.md,
            borderRadius: radius.lg,
            borderCurve: 'continuous',
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.hairline,
            minHeight: 92,
          }}>
          <View style={{ width: 32, height: 32, borderRadius: 9, borderCurve: 'continuous', backgroundColor: colors.goldWash, alignItems: 'center', justifyContent: 'center' }}>
            {update.isPending ? <ActivityIndicator size="small" color={colors.accent} /> : <Icon size={17} color={colors.accent} strokeWidth={1.9} />}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="bodyStrong">{copy.title}</AppText>
            <AppText variant="caption" tone="muted">
              {copy.description}
            </AppText>
          </View>
        </View>

        <InlineError message={error} />
      </View>
    </Sheet>
  );
}
