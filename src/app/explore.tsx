import { router } from 'expo-router';
import { CalendarDays, Compass, SearchX, UserRoundSearch } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Keyboard, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { EventCard } from '@/components/event-card';
import { FormInput } from '@/components/form-input';
import { ProductCard } from '@/components/product-card';
import { Skeleton } from '@/components/skeleton';
import { AthleteRow } from '@/components/social/athlete-row';
import { MomentCard } from '@/components/social/moment-card';
import { SectionHeader } from '@/components/ui/section-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TopBar } from '@/components/ui/top-bar';
import { useExplore, useSearch } from '@/hooks/use-social';
import { colors, spacing } from '@/theme/tokens';

type Tab = 'for_you' | 'athletes' | 'events';

export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('for_you');
  const searching = query.trim().length >= 2;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.black }}>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm }}>
        <TopBar title="Explorar" />
        <FormInput
          kind="search"
          placeholder="Atletas, eventos o productos"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => Keyboard.dismiss()}
          accessibilityLabel="Buscar atletas, eventos o productos"
        />
        {!searching ? (
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: 'for_you', label: 'Para ti' },
              { value: 'athletes', label: 'Atletas' },
              { value: 'events', label: 'Eventos' },
            ]}
          />
        ) : null}
      </View>

      {searching ? <SearchResults query={query} /> : <ExploreTabs tab={tab} />}
    </SafeAreaView>
  );
}

function ExploreTabs({ tab }: { tab: Tab }) {
  const explore = useExplore();

  if (explore.isPending) {
    return (
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Skeleton height={56} />
        <Skeleton height={56} />
        <Skeleton height={220} radius={16} />
      </View>
    );
  }

  if (explore.isError || !explore.data) {
    return <ErrorState error={explore.error} message="No pudimos cargar Explorar." onRetry={explore.refetch} />;
  }

  const { moments, athletes, events } = explore.data;

  if (tab === 'athletes') {
    return (
      <FlatList
        data={athletes}
        keyExtractor={(item) => item.username ?? item.name}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 }}
        ListHeaderComponent={athletes.length > 0 ? <AppText variant="caption" tone="muted" style={{ marginBottom: spacing.xs }}>Atletas que quizá conozcas</AppText> : null}
        renderItem={({ item }) => <AthleteRow athlete={item} />}
        ListEmptyComponent={
          <EmptyState icon={UserRoundSearch} title="Ya sigues a todos por aquí" message="Busca a alguien por su nombre o usuario en la barra de arriba." compact />
        }
      />
    );
  }

  if (tab === 'events') {
    return (
      <FlatList
        data={events}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md, flexGrow: 1 }}
        renderItem={({ item }) => <EventCard edition={item} onPress={() => router.push(`/events/${item.event.slug}`)} />}
        ListFooterComponent={
          events.length > 0 ? <AppButton label="Ver todos los eventos" variant="secondary" size="md" onPress={() => router.push('/events')} /> : null
        }
        ListEmptyComponent={
          <EmptyState icon={CalendarDays} title="Sin eventos próximos" message="Vuelve pronto: aquí aparecerán las próximas carreras." compact />
        }
      />
    );
  }

  return (
    <FlatList
      data={moments}
      keyExtractor={(item) => item.uuid}
      renderItem={({ item }) => <MomentCard moment={item} />}
      contentContainerStyle={{ paddingBottom: spacing.xxl, flexGrow: 1 }}
      initialNumToRender={3}
      windowSize={7}
      ListHeaderComponent={
        athletes.length > 0 ? (
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
            <SectionHeader title="Atletas para seguir" />
            {athletes.slice(0, 3).map((athlete) => (
              <AthleteRow key={athlete.username ?? athlete.name} athlete={athlete} />
            ))}
          </View>
        ) : null
      }
      ListFooterComponent={
        moments.length > 0 ? (
          <View style={{ padding: spacing.lg }}>
            <AppButton label="Ver más en la comunidad" variant="secondary" size="md" onPress={() => router.push('/feed')} />
          </View>
        ) : null
      }
      ListEmptyComponent={
        <EmptyState
          icon={Compass}
          title="La comunidad apenas comienza"
          message="Comparte tu primera carrera o entrenamiento y sé de los primeros en aparecer aquí."
          actionLabel="Crear un momento"
          onAction={() => router.push('/moments/create')}
          compact
        />
      }
    />
  );
}

function SearchResults({ query }: { query: string }) {
  const results = useSearch(query);

  if (results.isPending && !results.data) {
    return (
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Skeleton height={48} />
        <Skeleton height={48} />
      </View>
    );
  }

  if (results.isError && !results.data) {
    return <ErrorState error={results.error} message="No pudimos buscar. Intenta otra vez." onRetry={results.refetch} />;
  }

  const data = results.data;
  const empty = !data || (data.athletes.length === 0 && data.events.length === 0 && data.products.length === 0);

  if (empty) {
    return (
      <EmptyState icon={SearchX} title="Sin resultados" message={`No encontramos nada para “${query.trim()}”. Prueba con otro nombre o usuario.`} compact />
    );
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }}>
      {data.athletes.length > 0 ? (
        <View>
          <SectionHeader title="Atletas" />
          {data.athletes.map((athlete) => (
            <AthleteRow key={athlete.username ?? athlete.name} athlete={athlete} />
          ))}
        </View>
      ) : null}
      {data.events.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <SectionHeader title="Eventos" style={{ marginBottom: 0 }} />
          {data.events.map((edition) => (
            <EventCard key={edition.id} edition={edition} onPress={() => router.push(`/events/${edition.event.slug}`)} />
          ))}
        </View>
      ) : null}
      {data.products.length > 0 ? (
        <View>
          <SectionHeader title="Tienda" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {data.products.map((product) => (
              <View key={product.uuid} style={{ width: '48%' }}>
                <ProductCard product={product} onPress={() => router.push(`/store/${product.slug}`)} />
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
