/**
 * Portarretrato of a story — the DIGITAL design of the PHYSICAL frame sold
 * in the store (product «Portarretrato inteligente»). The athlete picks
 * the main photo of the memory, one of the print templates defined on the
 * server and the words to print; the preview is rendered by the server
 * with the same composer as the print file, so what is shown is what gets
 * printed. Designs are saved (`/me/stories/{id}/portrait-designs`) and can
 * be edited later; «Pedir este portarretrato» adds the frame to the cart
 * with the design attached to the line, and the order keeps a copy of it
 * for production (later edits never change an order already placed).
 *
 * The album the frame opens over NFC is the story itself: its photo order
 * and cover are managed in «Fotos y videos».
 */

import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Frame, ImagePlus, PenLine, Plus, ShoppingBag, Trash2 } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, PixelRatio, Platform, ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PressableScale } from '@/components/motion/pressable-scale';
import { Skeleton } from '@/components/skeleton';
import { Chip } from '@/components/ui/chip';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InlineError } from '@/components/ui/inline-error';
import { TopBar } from '@/components/ui/top-bar';
import { FormArea, FormGroup, FormRow } from '@/features/stories/components/form-row';
import { useDeletePortraitDesign, usePortraitBuilder, usePortraitPreview, useSavePortraitDesign } from '@/features/stories/use-portrait';
import { useAddCartItem } from '@/hooks/use-cart';
import { useKeyboardInset, useRevealFocusedInput } from '@/hooks/use-keyboard-inset';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/i18n';
import { PORTRAIT_FIELD_MAX, type PortraitBuilder, type PortraitDesign, type PortraitDraft, type PortraitField, type PortraitFields } from '@/schemas/portrait';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { formatMoney } from '@/utils/money';

/** 20 × 25 cm print: height = width × 1.25. */
const PRINT_RATIO = 25 / 20;

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/legacy');
}

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof AppError && caught.kind !== 'not_found' ? caught.message : fallback;
}

/** Adds the frame with this design to the cart and opens it. */
function useOrderPortrait(builder: PortraitBuilder) {
  const add = useAddCartItem();
  const [error, setError] = useState<string | null>(null);
  const product = builder.product;

  function order(design: PortraitDesign) {
    if (!product || !product.available) return;
    setError(null);
    add.mutate(
      { product_variant_uuid: product.variant_uuid, quantity: 1, portrait_design_uuid: design.uuid },
      { onSuccess: () => router.push('/cart' as Href), onError: (caught) => setError(errorMessage(caught, '')) },
    );
  }

  return { order, ordering: add.isPending ? (add.variables?.portrait_design_uuid ?? null) : null, error };
}

/** One line about the physical product: price, or why it cannot be ordered yet. */
function ProductLine({ builder }: { builder: PortraitBuilder }) {
  const { t } = useI18n();
  const product = builder.product;

  if (!product) {
    return (
      <AppText variant="caption" tone="muted">
        {t('El portarretrato todavía no está a la venta. Puedes guardar tu diseño y pedirlo cuando esté disponible.')}
      </AppText>
    );
  }

  if (!product.available) {
    return (
      <AppText variant="caption" tone="muted">
        {t('{name} está agotado por ahora. Tu diseño queda guardado para pedirlo después.', { name: product.name })}
      </AppText>
    );
  }

  return (
    <AppText variant="caption" tone="muted">
      {product.price_minor !== null
        ? t('{name} · {price}. Lo imprimimos con tu diseño y lo enviamos a tu domicilio.', { name: product.name, price: formatMoney(product.price_minor, product.currency) })
        : t('{name}. Lo imprimimos con tu diseño y lo enviamos a tu domicilio.', { name: product.name })}
    </AppText>
  );
}

interface DesignListProps {
  publicId: string;
  builder: PortraitBuilder;
  onEdit: (design: PortraitDesign | null) => void;
}

function DesignList({ publicId, builder, onEdit }: DesignListProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const remove = useDeletePortraitDesign(publicId);
  const { order, ordering, error: orderError } = useOrderPortrait(builder);
  const [toDelete, setToDelete] = useState<PortraitDesign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canOrder = !!builder.product?.available;

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}>
        <View style={{ width: '100%', maxWidth: 640, paddingLeft: Math.max(insets.left, spacing.md), paddingRight: Math.max(insets.right, spacing.md), gap: spacing.lg }}>
          <View style={{ gap: spacing.xs }}>
            <AppText variant="subtitle" accessibilityRole="header">
              {t('Tus diseños')}
            </AppText>
            <ProductLine builder={builder} />
          </View>

          <InlineError message={error ?? orderError} />

          {builder.designs.map((design) => (
            <View
              key={design.uuid}
              style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline, ...shadows.soft }}>
              <View style={{ width: 72, height: 90, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.black, padding: 4 }}>
                {design.photo_thumb_url ? <Image source={{ uri: design.photo_thumb_url }} style={{ flex: 1 }} contentFit="cover" accessibilityIgnoresInvertColors /> : null}
              </View>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <AppText variant="bodyStrong" numberOfLines={2}>
                  {design.title || design.fields.event || t('Mi portarretrato')}
                </AppText>
                <AppText variant="caption" tone="subtle">
                  {design.last_ordered_at ? t('Plantilla {name} · Ya lo pediste', { name: design.template_label ?? design.template }) : t('Plantilla {name}', { name: design.template_label ?? design.template })}
                </AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xxs }}>
                  <AppButton label={t('Editar')} icon={PenLine} variant="secondary" size="sm" fullWidth={false} onPress={() => onEdit(design)} />
                  {canOrder ? (
                    <AppButton
                      label={t('Pedir este portarretrato')}
                      icon={ShoppingBag}
                      size="sm"
                      fullWidth={false}
                      loading={ordering === design.uuid}
                      disabled={ordering !== null}
                      onPress={() => order(design)}
                    />
                  ) : null}
                  <AppButton label={t('Eliminar')} icon={Trash2} variant="ghost" size="sm" fullWidth={false} accessibilityLabel={t('Eliminar diseño')} onPress={() => setToDelete(design)} />
                </View>
              </View>
            </View>
          ))}

          <AppButton label={t('Nuevo diseño')} icon={Plus} variant="secondary" onPress={() => onEdit(null)} />
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={!!toDelete}
        title={t('¿Eliminar este diseño?')}
        description={t('Se borra de tus diseños. Los pedidos que ya hiciste con él se imprimen igual.')}
        confirmLabel={t('Eliminar')}
        destructive
        loading={remove.isPending}
        onConfirm={() => {
          const design = toDelete;
          if (!design) return;
          remove.mutate(design.uuid, {
            onSuccess: () => {
              setToDelete(null);
              haptics.light();
            },
            onError: (caught) => {
              setToDelete(null);
              setError(errorMessage(caught, t('No pudimos eliminarlo. Intenta de nuevo.')));
            },
          });
        }}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}

interface EditorProps {
  publicId: string;
  builder: PortraitBuilder;
  design: PortraitDesign | null;
  onDone: () => void;
}

function initialDraft(builder: PortraitBuilder, design: PortraitDesign | null): PortraitDraft {
  const photo = builder.photos.find((item) => item.uuid === design?.photo_uuid) ?? builder.photos.find((item) => item.is_cover) ?? builder.photos[0];
  const template = design?.template ?? builder.default_template ?? builder.templates[0]?.value ?? '';
  return { title: design?.title ?? null, template, photo_uuid: photo?.uuid ?? '', fields: { ...(design?.fields ?? builder.defaults) } };
}

function Editor({ publicId, builder, design: initial, onDone }: EditorProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width } = useResponsive();
  const save = useSavePortraitDesign(publicId);
  const { order, ordering, error: orderError } = useOrderPortrait(builder);

  const [design, setDesign] = useState<PortraitDesign | null>(initial);
  const [draft, setDraft] = useState<PortraitDraft>(() => initialDraft(builder, initial));
  const [saved, setSaved] = useState<string>(() => JSON.stringify(initialDraft(builder, initial)));
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const onScroll = useRevealFocusedInput(scrollRef);
  const keyboard = useKeyboardInset();
  const spacerStyle = useAnimatedStyle(() => ({ height: Math.max(0, keyboard.value) }));

  const columnWidth = Math.min(width, 640) - Math.max(insets.left, spacing.md) - Math.max(insets.right, spacing.md);
  const previewWidth = Math.min(columnWidth, 360);
  const previewPx = Math.round(previewWidth * Math.min(PixelRatio.get(), 2.5));
  const preview = usePortraitPreview(publicId, draft.photo_uuid && draft.template ? draft : null, previewPx);

  const dirty = JSON.stringify(draft) !== saved || design === null;
  const template = builder.templates.find((item) => item.value === draft.template) ?? null;
  const canOrder = !!builder.product?.available;

  function setField(field: PortraitField, value: string) {
    setDraft((current) => ({ ...current, fields: { ...current.fields, [field]: value } as PortraitFields }));
  }

  function submit() {
    if (!draft.photo_uuid) {
      setError(t('Elige la foto principal de tu portarretrato.'));
      return;
    }
    setError(null);
    save.mutate(
      { uuid: design?.uuid ?? null, draft },
      {
        onSuccess: (stored) => {
          haptics.success();
          setDesign(stored);
          setSaved(JSON.stringify(draft));
        },
        onError: (caught) => {
          haptics.error();
          setError(errorMessage(caught, t('No pudimos guardar tu diseño. Intenta de nuevo.')));
        },
      },
    );
  }

  const row = (field: PortraitField, label: string, placeholder: string, last = false) => (
    <FormRow
      label={label}
      value={draft.fields[field] ?? ''}
      onChangeText={(value) => setField(field, value)}
      placeholder={placeholder}
      maxLength={PORTRAIT_FIELD_MAX[field]}
      editable={!save.isPending}
      last={last}
    />
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.xl }}>
        <View style={{ width: '100%', maxWidth: 640, paddingLeft: Math.max(insets.left, spacing.md), paddingRight: Math.max(insets.right, spacing.md), gap: spacing.lg }}>
          {/* Live preview inside a simple frame: the server render of the print. */}
          <View style={{ alignItems: 'center', gap: spacing.xs }}>
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel={t('Vista previa de tu portarretrato')}
              style={{ width: previewWidth, padding: 10, borderRadius: radius.sm, backgroundColor: colors.black, ...shadows.soft }}>
              <View style={{ width: previewWidth - 20, height: (previewWidth - 20) * PRINT_RATIO, backgroundColor: template?.background ?? colors.surfaceMuted, overflow: 'hidden' }}>
                {preview.image ? <Image source={{ uri: preview.image }} style={{ flex: 1 }} contentFit="contain" transition={180} accessibilityIgnoresInvertColors /> : <Skeleton width={previewWidth - 20} height={(previewWidth - 20) * PRINT_RATIO} radius={0} />}
                {preview.loading ? (
                  <View style={{ position: 'absolute', top: spacing.sm, right: spacing.sm, padding: 6, borderRadius: radius.pill, backgroundColor: colors.card }}>
                    <ActivityIndicator size="small" color={colors.accent} />
                  </View>
                ) : null}
              </View>
            </View>
            <AppText variant="caption" tone="subtle" align="center" style={{ fontSize: 13 }}>
              {t('Así se imprime: 20 × 25 cm. Lo que dejes vacío no aparece.')}
            </AppText>
            <InlineError message={preview.error} />
          </View>

          {/* Main photo */}
          <View style={{ gap: spacing.xs }}>
            <AppText variant="eyebrow" tone="subtle" style={{ marginLeft: spacing.xxs }}>
              {t('Foto principal')}
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: 2 }}>
              {builder.photos.map((photo, index) => {
                const selected = photo.uuid === draft.photo_uuid;
                return (
                  <PressableScale
                    key={photo.uuid}
                    onPress={() => setDraft((current) => ({ ...current, photo_uuid: photo.uuid }))}
                    scaleTo={0.95}
                    haptic="selection"
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={t('Foto {position} de {total}', { position: index + 1, total: builder.photos.length })}
                    style={{ width: 72, height: 72, borderRadius: radius.md, overflow: 'hidden', borderWidth: selected ? 3 : 1, borderColor: selected ? colors.gold : colors.hairline, backgroundColor: colors.surfaceMuted }}>
                    {photo.thumb_url ?? photo.url ? <Image source={{ uri: photo.thumb_url ?? photo.url ?? undefined }} style={{ flex: 1 }} contentFit="cover" /> : null}
                  </PressableScale>
                );
              })}
            </ScrollView>
          </View>

          {/* Template */}
          <View style={{ gap: spacing.xs }}>
            <AppText variant="eyebrow" tone="subtle" style={{ marginLeft: spacing.xxs }}>
              {t('Plantilla')}
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {builder.templates.map((item) => (
                <Chip key={item.value} label={item.label} selected={item.value === draft.template} onPress={() => setDraft((current) => ({ ...current, template: item.value }))} />
              ))}
            </View>
            {template?.description ? (
              <AppText variant="caption" tone="muted" style={{ marginLeft: spacing.xxs }}>
                {template.description}
              </AppText>
            ) : null}
          </View>

          <FormGroup title={t('Diseño')} footer={t('Solo para reconocerlo en tu lista; no se imprime.')}>
            <FormRow
              label={t('Nombre del diseño')}
              value={draft.title ?? ''}
              onChangeText={(value) => setDraft((current) => ({ ...current, title: value }))}
              placeholder={t('Para mamá')}
              maxLength={80}
              editable={!save.isPending}
              last
            />
          </FormGroup>

          <FormGroup title={t('Lo que se imprime')}>
            {row('name', t('Nombre||nombre completo del atleta'), t('Como quieres aparecer'))}
            {row('event', t('Carrera'), t('Nombre del evento'))}
            {row('details', t('Lugar y fecha'), t('Ciudad · fecha'))}
            {row('time', t('Tiempo'), 'h:mm:ss')}
            {row('distance', t('Distancia'), '21K')}
            {row('pace', t('Ritmo'), '5:30 /km')}
            {row('position', t('Posición general'), '412')}
            {row('category', t('Categoría'), t('Libre varonil'))}
            {row('bib', t('Dorsal'), '1234', true)}
          </FormGroup>

          <FormGroup title={t('Dedicatoria')}>
            <FormArea
              label={t('Dedicatoria')}
              value={draft.fields.dedication ?? ''}
              onChangeText={(value) => setField('dedication', value)}
              placeholder={t('A quién le dedicas esta meta…')}
              maxLength={PORTRAIT_FIELD_MAX.dedication}
              minHeight={72}
              editable={!save.isPending}
            />
          </FormGroup>

          <InlineError message={error ?? orderError} />
          <ProductLine builder={builder} />
        </View>
      </ScrollView>

      <Animated.View style={spacerStyle} />

      {/* Save first; the order always uses a saved design. */}
      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.hairline,
          paddingTop: spacing.sm,
          paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.xs,
          paddingLeft: Math.max(insets.left, spacing.lg),
          paddingRight: Math.max(insets.right, spacing.lg),
        }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm, width: '100%', maxWidth: 600 }}>
          {design && !dirty ? (
            <>
              <AppButton label={t('Listo')} variant="secondary" size="md" fullWidth={false} style={{ flex: 1 }} onPress={onDone} />
              {canOrder ? (
                <AppButton
                  label={t('Pedir este portarretrato')}
                  icon={ShoppingBag}
                  size="md"
                  fullWidth={false}
                  style={{ flex: 1.6 }}
                  loading={ordering === design.uuid}
                  onPress={() => order(design)}
                />
              ) : null}
            </>
          ) : (
            <AppButton label={design ? t('Guardar cambios') : t('Guardar diseño')} size="md" loading={save.isPending} onPress={submit} />
          )}
        </View>
      </View>
    </View>
  );
}

export default function PortraitScreen() {
  const { t } = useI18n();
  const { publicId = '' } = useLocalSearchParams<{ publicId?: string }>();
  const insets = useSafeAreaInsets();
  const builder = usePortraitBuilder(publicId);
  /** `undefined` = the list; `null` = a new design; a design = editing it. */
  const [editing, setEditing] = useState<PortraitDesign | null | undefined>(undefined);

  const data = builder.data ?? null;
  // With nothing saved yet the designer opens straight away.
  const mode = useMemo(() => (editing !== undefined ? 'editor' : data && data.designs.length === 0 ? 'editor' : 'list'), [editing, data]);
  const missing = builder.error instanceof AppError && builder.error.kind === 'not_found';
  const back = mode === 'editor' && data && data.designs.length > 0 ? () => setEditing(undefined) : leave;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ paddingLeft: Math.max(insets.left, spacing.md), paddingRight: Math.max(insets.right, spacing.md), borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
        <TopBar title={mode === 'editor' ? (editing ? t('Editar diseño') : t('Diseña tu portarretrato')) : t('Portarretrato')} onBack={back} />
      </View>

      {builder.isError && !data ? (
        <ErrorState
          error={builder.error}
          title={missing ? t('Aún no disponible') : undefined}
          message={missing ? t('Todavía no puedes diseñar tu portarretrato desde la app. Mientras tanto puedes hacerlo en finisherlegacy.com.') : t('No pudimos cargar el diseñador.')}
          onRetry={missing ? undefined : builder.refetch}
          onBack={leave}
        />
      ) : !data ? (
        <View style={{ padding: spacing.md, gap: spacing.lg, alignItems: 'center' }}>
          <Skeleton width={280} height={350} radius={radius.sm} />
          <Skeleton height={72} radius={radius.md} />
        </View>
      ) : data.photos.length === 0 ? (
        <EmptyState
          icon={ImagePlus}
          title={t('Primero agrega una foto')}
          message={t('Tu portarretrato se imprime con una foto de este recuerdo. Súbela y vuelve aquí.')}
          actionLabel={t('Agregar fotos')}
          onAction={() => router.push(`/stories/${publicId}/media?add=1` as Href)}
        />
      ) : data.templates.length === 0 ? (
        <EmptyState icon={Frame} title={t('Diseños no disponibles')} message={t('Por ahora no hay plantillas para imprimir. Intenta más tarde.')} actionLabel={t('Volver')} onAction={leave} />
      ) : mode === 'editor' ? (
        <Editor key={editing?.uuid ?? 'new'} publicId={publicId} builder={data} design={editing ?? null} onDone={() => setEditing(undefined)} />
      ) : (
        <DesignList publicId={publicId} builder={data} onEdit={setEditing} />
      )}
    </View>
  );
}
