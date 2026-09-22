import { router } from 'expo-router';
import { HeartHandshake } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { MascotTip } from '@/components/brand/mascot-tip';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FormInput } from '@/components/form-input';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { Badge } from '@/components/ui/badge';
import { Sheet } from '@/components/ui/sheet';
import { useCreateSupportSession, useSupportSessions } from '@/hooks/use-support';
import { spacing } from '@/theme/tokens';
import { describeSupportStatus } from '@/utils/support-status';
import type { SupportSessionSummary } from '@/types/models';

function SessionRow({ session, onPress }: { session: SupportSessionSummary; onPress: () => void }) {
  const statusCopy = describeSupportStatus(session.status);

  return (
    <Card onPress={onPress} style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <AppText variant="bodyStrong" style={{ flex: 1 }}>
          {session.title}
        </AppText>
        <Badge label={statusCopy.label} variant={statusCopy.variant} />
      </View>
      <AppText variant="caption" tone="muted">
        {[session.allow_text ? 'Mensajes de texto' : null, session.allow_audio ? 'Mensajes de voz' : null]
          .filter(Boolean)
          .join(' · ') || 'Sin canales activos'}
      </AppText>
    </Card>
  );
}

export default function SupportScreen() {
  const { data, isPending, isError, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSupportSessions();
  const createSession = useCreateSupportSession();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const sessions = useMemo<SupportSessionSummary[]>(() => data?.pages.flatMap((page) => page.rows) ?? [], [data]);

  async function handleCreate() {
    setFormError(null);
    if (title.trim().length === 0) {
      setFormError('Ponle un nombre a tu sesión de apoyo.');
      return;
    }
    try {
      const session = await createSession.mutateAsync({ title: title.trim() });
      setCreating(false);
      setTitle('');
      router.push(`/support/${session.id}`);
    } catch (error) {
      setFormError(error instanceof AppError ? error.message : 'No pudimos crear tu sesión de apoyo.');
    }
  }

  const header = (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.sm }}>
      <ScreenHeader title="Mi equipo de apoyo" />
      <MascotTip
        id="support-intro"
        message="Las personas que te apoyan pueden dejarte mensajes que aparecen mientras corres. Comparte tu código con ellas."
      />
      <AppButton label="Nueva sesión de apoyo" onPress={() => setCreating(true)} fullWidth={false} style={{ alignSelf: 'flex-start', paddingHorizontal: spacing.lg }} />
    </View>
  );

  return (
    <Screen edges={['top', 'left', 'right']} padded={false}>
      {isPending ? (
        <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          <ScreenHeader title="Mi equipo de apoyo" />
          <Skeleton height={90} radius={16} />
          <Skeleton height={90} radius={16} />
        </View>
      ) : isError ? (
        <View>
          {header}
          <ErrorState message="No pudimos cargar tu equipo de apoyo." onRetry={refetch} />
        </View>
      ) : sessions.length === 0 ? (
        <View>
          {header}
          <EmptyState
            icon={HeartHandshake}
            title="Aún no tienes sesiones de apoyo"
            message="Crea una para que tu gente pueda dejarte mensajes durante tu próxima carrera."
          />
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={header}
          contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => hasNextPage && fetchNextPage()}
          ListFooterComponent={isFetchingNextPage ? <Skeleton height={60} /> : null}
          renderItem={({ item }) => <SessionRow session={item} onPress={() => router.push(`/support/${item.id}`)} />}
        />
      )}

      <Sheet visible={creating} onClose={() => setCreating(false)}>
        <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
          <AppText variant="subtitle">Nueva sesión de apoyo</AppText>
          <FormInput label="Nombre" value={title} onChangeText={setTitle} placeholder="Ej. Maratón CDMX 2026" />
          {formError ? (
            <AppText variant="caption" tone="destructive">
              {formError}
            </AppText>
          ) : null}
          <AppButton label="Crear" onPress={handleCreate} loading={createSession.isPending} />
        </View>
      </Sheet>
    </Screen>
  );
}
