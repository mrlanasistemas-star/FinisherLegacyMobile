import { router, type Href } from 'expo-router';
import { Link2, LocateFixed, Mail, ShieldCheck, UserMinus, UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { Share, View } from 'react-native';

import type { FamilyLink, FamilyMembership } from '@/api/family';
import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ErrorState } from '@/components/error-state';
import { FormInput } from '@/components/form-input';
import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { Skeleton } from '@/components/skeleton';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InlineError } from '@/components/ui/inline-error';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { Sheet } from '@/components/ui/sheet';
import { LargeTitleScroll } from '@/components/ui/top-bar';
import { StatusBadge } from '@/features/family/components/live-viewer';
import { PersonRow } from '@/features/family/components/person-row';
import { formatAgo } from '@/features/tracking/format';
import { useNow } from '@/features/tracking/use-live-tracking';
import {
  useAcceptFamilyInvitation,
  useDeclineFamilyInvitation,
  useFamily,
  useFollowing,
  useInviteFamily,
  useRemoveFamilyLink,
  useUpdateFamilyLabel,
} from '@/hooks/use-family';
import { useI18n } from '@/i18n';
import { showToast } from '@/stores/toastStore';
import { colors, spacing } from '@/theme/tokens';

/**
 * Familia (Perfil → Configuración → Familia, docs/renovacion/familia.md):
 * who I'm following live right now, invitations for me, my people (invite,
 * label, remove) and the families I belong to. Being family never shows a
 * location by itself — the athlete shares it explicitly each time.
 */
export default function FamilyScreen() {
  const { t } = useI18n();
  const family = useFamily();
  const following = useFollowing();
  const now = useNow(30_000);
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<FamilyLink | null>(null);
  const [leaving, setLeaving] = useState<FamilyMembership | null>(null);
  const accept = useAcceptFamilyInvitation();
  const decline = useDeclineFamilyInvitation();
  const remove = useRemoveFamilyLink();

  const refreshing = family.isRefetching || following.isRefetching;
  const refresh = () => {
    family.refetch();
    following.refetch();
  };

  async function answer(uuid: string, kind: 'accept' | 'decline') {
    try {
      if (kind === 'accept') {
        await accept.mutateAsync(uuid);
        showToast(t('Ahora formas parte de su familia.'), 'success');
      } else {
        await decline.mutateAsync(uuid);
      }
    } catch (error) {
      showToast(error instanceof AppError ? error.message : t('No pudimos responder. Intenta otra vez.'), 'destructive');
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <LargeTitleScroll
        title={t('Familia')}
        subtitle={t('Las personas que pueden seguirte en vivo cuando tú lo decidas.')}
        refreshControl={<BrandRefreshControl refreshing={refreshing} onRefresh={refresh} />}
        contentContainerStyle={{ gap: spacing.lg }}>
        {family.isPending ? (
          <View style={{ gap: spacing.md }}>
            <Skeleton height={120} radius={16} />
            <Skeleton height={160} radius={16} />
          </View>
        ) : family.isError ? (
          <ErrorState message={t('No pudimos cargar tu familia.')} onRetry={family.refetch} />
        ) : (
          <>
            {(following.data?.length ?? 0) > 0 ? (
              <ListGroup title={t('Siguiendo a…')}>
                {following.data!.map((item, index) => (
                  <PersonRow
                    key={item.uuid}
                    person={item.athlete}
                    fallbackName={item.athlete.name}
                    caption={[item.event_name, t('Actualizado {ago}', { ago: formatAgo(item.last_update_at, now) })].filter(Boolean).join(' · ')}
                    trailing={<StatusBadge status={item.status} />}
                    onPress={() => router.push(`/family/following/${item.uuid}` as Href)}
                    divider={index < following.data!.length - 1}
                  />
                ))}
              </ListGroup>
            ) : null}

            {family.data.invitations.length > 0 ? (
              <ListGroup title={t('Invitaciones para ti')}>
                {family.data.invitations.map((invite, index) => (
                  <View key={invite.uuid} style={{ paddingBottom: spacing.sm }}>
                    <PersonRow
                      person={invite.athlete}
                      fallbackName={invite.athlete.name}
                      caption={invite.label ? t('Te agregó como «{label}»', { label: invite.label }) : t('Te invitó a su familia')}
                      divider={false}
                    />
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <AppButton label={t('Aceptar')} size="sm" style={{ flex: 1 }} loading={accept.isPending && accept.variables === invite.uuid} onPress={() => answer(invite.uuid, 'accept')} />
                      <AppButton label={t('Rechazar')} size="sm" variant="secondary" style={{ flex: 1 }} loading={decline.isPending && decline.variables === invite.uuid} onPress={() => answer(invite.uuid, 'decline')} />
                    </View>
                    {index < family.data.invitations.length - 1 ? <View style={{ height: spacing.xs }} /> : null}
                  </View>
                ))}
              </ListGroup>
            ) : null}

            <ListGroup title={t('Mi familia')} footer={t('Solo verán tu ubicación cuando la compartas con ellos, y solo mientras dure.')}>
              {family.data.links.map((link) => (
                <PersonRow
                  key={link.uuid}
                  person={link.contact}
                  fallbackName={link.label ?? t('Invitación por enlace')}
                  caption={describeLink(link, t)}
                  trailing={link.status === 'pending' ? <Badge label={t('Pendiente')} variant="warning" /> : undefined}
                  onPress={() => setEditing(link)}
                  accessibilityHint={t('Editar o quitar')}
                />
              ))}
              <ListRow icon={UserPlus} label={t('Invitar a alguien')} onPress={() => setInviting(true)} />
            </ListGroup>

            <ListGroup>
              <ListRow
                icon={LocateFixed}
                label={t('Quién ve mi ubicación')}
                description={t('Compartir en vivo, dejar de compartir y quitar personas')}
                onPress={() => router.push('/family/sharing')}
              />
            </ListGroup>

            {family.data.memberships.length > 0 ? (
              <ListGroup title={t('Soy familia de')} footer={t('Te avisaremos cuando compartan su ubicación contigo.')}>
                {family.data.memberships.map((m, index) => (
                  <PersonRow
                    key={m.uuid}
                    person={m.athlete}
                    fallbackName={m.athlete.name}
                    caption={m.label ? t('Te agregó como «{label}»', { label: m.label }) : null}
                    trailing={
                      <AppButton label={t('Salir')} size="sm" variant="ghost" fullWidth={false} onPress={() => setLeaving(m)} />
                    }
                    divider={index < family.data.memberships.length - 1}
                  />
                ))}
              </ListGroup>
            ) : null}

            <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xs }}>
              <ShieldCheck size={18} color={colors.accent} />
              <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
                {t('Ser familia no da acceso permanente a tu ubicación. Tú eliges con quién compartir y por cuánto tiempo, y puedes dejar de compartir en cualquier momento.')}
              </AppText>
            </View>
          </>
        )}
      </LargeTitleScroll>

      <InviteSheet visible={inviting} onClose={() => setInviting(false)} />
      <EditLinkSheet link={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        visible={leaving !== null}
        title={t('¿Salir de su familia?')}
        description={t('Dejarás de ver su ubicación cuando la comparta. Puede volver a invitarte cuando quiera.')}
        confirmLabel={t('Salir')}
        destructive
        loading={remove.isPending}
        onConfirm={async () => {
          if (!leaving) return;
          try {
            await remove.mutateAsync(leaving.uuid);
            setLeaving(null);
          } catch {
            showToast(t('No pudimos completar la acción. Intenta otra vez.'), 'destructive');
          }
        }}
        onCancel={() => setLeaving(null)}
      />
    </View>
  );
}

function describeLink(link: FamilyLink, t: ReturnType<typeof useI18n>['t']): string | null {
  if (link.status === 'pending') {
    return link.kind === 'link' ? t('Enlace de invitación sin abrir') : t('Esperando que acepte');
  }
  return link.label;
}

/** Invite by email (existing account) or create a shareable invite link. */
function InviteSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const invite = useInviteFamily();
  const [email, setEmail] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  function close() {
    setEmail('');
    setLabel('');
    setError(null);
    onClose();
  }

  async function send(withEmail: boolean) {
    setError(null);
    if (withEmail && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError(t('Escribe un correo válido.'));
      return;
    }
    try {
      const created = await invite.mutateAsync({ email: withEmail ? email.trim() : null, label: label.trim() || null });
      if (created.invite_url) {
        await Share.share({ message: t('Únete a mi familia en Finisher Legacy para seguirme en vivo cuando corra: {url}', { url: created.invite_url }), url: created.invite_url });
        showToast(t('Enlace de invitación creado.'), 'success');
      } else {
        showToast(t('Invitación enviada.'), 'success');
      }
      close();
    } catch (e) {
      setError(e instanceof AppError ? (e.fieldErrors?.email?.[0] ?? e.message) : t('No pudimos enviar la invitación. Intenta otra vez.'));
    }
  }

  return (
    <Sheet visible={visible} onClose={close}>
      <View style={{ gap: spacing.md }}>
        <AppText variant="title">{t('Invitar a mi familia')}</AppText>
        <AppText variant="caption" tone="muted">
          {t('Podrán seguirte en vivo solo cuando compartas tu ubicación con ellos.')}
        </AppText>
        <FormInput label={t('¿Quién es para ti? (opcional)')} placeholder={t('Mamá, Mi pareja…')} value={label} onChangeText={setLabel} maxLength={60} />
        <FormInput label={t('Correo de su cuenta')} kind="email" icon={Mail} value={email} onChangeText={setEmail} hint={t('Si ya tiene cuenta en Finisher Legacy.')} />
        <InlineError message={error} />
        <AppButton label={t('Enviar invitación')} icon={Mail} loading={invite.isPending && invite.variables?.email != null} onPress={() => send(true)} />
        <AppButton label={t('Crear enlace para compartir')} icon={Link2} variant="secondary" loading={invite.isPending && invite.variables?.email == null} onPress={() => send(false)} />
      </View>
    </Sheet>
  );
}

/** Rename ("Mamá") or remove a person / cancel a pending invite. */
function EditLinkSheet({ link, onClose }: { link: FamilyLink | null; onClose: () => void }) {
  const { t } = useI18n();
  const update = useUpdateFamilyLabel();
  const remove = useRemoveFamilyLink();
  const [label, setLabel] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const current = label ?? link?.label ?? '';

  function close() {
    setLabel(null);
    setConfirming(false);
    onClose();
  }

  async function save() {
    if (!link) return;
    try {
      await update.mutateAsync({ uuid: link.uuid, label: current.trim() || null });
      showToast(t('Guardado.'), 'success');
      close();
    } catch {
      showToast(t('No pudimos guardar. Intenta otra vez.'), 'destructive');
    }
  }

  return (
    <>
      <Sheet visible={link !== null && !confirming} onClose={close}>
        <View style={{ gap: spacing.md }}>
          <AppText variant="title">{link?.contact?.name ?? t('Invitación por enlace')}</AppText>
          <FormInput label={t('¿Quién es para ti?')} placeholder={t('Mamá, Mi pareja…')} value={current} onChangeText={setLabel} maxLength={60} />
          <AppButton label={t('Guardar')} loading={update.isPending} onPress={save} />
          <AppButton
            label={link?.status === 'pending' ? t('Cancelar invitación') : t('Quitar de mi familia')}
            icon={UserMinus}
            variant="ghost"
            onPress={() => setConfirming(true)}
          />
        </View>
      </Sheet>
      <ConfirmDialog
        visible={link !== null && confirming}
        title={link?.status === 'pending' ? t('¿Cancelar la invitación?') : t('¿Quitar a esta persona?')}
        description={t('Dejará de ver tu ubicación de inmediato, también si la estás compartiendo ahora.')}
        confirmLabel={t('Quitar')}
        destructive
        loading={remove.isPending}
        onConfirm={async () => {
          if (!link) return;
          try {
            await remove.mutateAsync(link.uuid);
            close();
          } catch {
            showToast(t('No pudimos completar la acción. Intenta otra vez.'), 'destructive');
          }
        }}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
