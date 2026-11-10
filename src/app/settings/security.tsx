import { useQueryClient } from '@tanstack/react-query';
import { KeyRound, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { deleteAccount, requestPasswordReset } from '@/api/account';
import { AppError } from '@/api/errors';
import { tokenStorage } from '@/api/secureStore';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { FormInput } from '@/components/form-input';
import { InlineError } from '@/components/ui/inline-error';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { Sheet } from '@/components/ui/sheet';
import { LargeTitleScroll } from '@/components/ui/top-bar';
import { useAuthStore } from '@/stores/authStore';
import { showToast } from '@/stores/toastStore';
import { fontFamily, spacing } from '@/theme/tokens';
import { deleteConfirmationWord, resolveDeleteConfirmation } from '@/utils/delete-confirmation';
import { ensureOnline } from '@/utils/network';
import { useI18n } from '@/i18n';

export default function SecurityScreen() {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [sendingReset, setSendingReset] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [socialMode, setSocialMode] = useState(false);
  const [secret, setSecret] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendReset() {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      await ensureOnline();
      await requestPasswordReset(user.email);
      showToast(t('Te enviamos un enlace a {email}.', { email: user.email }), 'success');
    } catch (caught) {
      showToast(caught instanceof AppError ? caught.message : t('No pudimos enviar el correo. Intenta otra vez.'), 'destructive');
    } finally {
      setSendingReset(false);
    }
  }

  async function confirmDelete() {
    setError(null);
    if (!secret.trim()) {
      setError(socialMode ? t('Escribe {word} para confirmar.', { word: deleteConfirmationWord() }) : t('Escribe tu contraseña para confirmar.'));
      return;
    }
    setDeleting(true);
    try {
      await ensureOnline();
      await deleteAccount(socialMode ? { confirmation: resolveDeleteConfirmation(secret) } : { password: secret });
      await tokenStorage.clear();
      queryClient.clear();
      useAuthStore.getState().clearSession();
      showToast(t('Tu cuenta fue eliminada. Gracias por correr con nosotros.'), 'default');
    } catch (caught) {
      const message =
        caught instanceof AppError
          ? (caught.fieldErrors?.password?.[0] ?? caught.fieldErrors?.confirmation?.[0] ?? caught.message)
          : t('No pudimos eliminar tu cuenta. Intenta otra vez.');
      setError(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <LargeTitleScroll title={t('Contraseña y cuenta')} contentContainerStyle={{ gap: spacing.lg }}>
        <ListGroup title={t('Contraseña')}>
          <ListRow
            icon={KeyRound}
            label={t('Cambiar contraseña')}
            description={user?.email ? t('Te enviaremos un enlace seguro a {email}.', { email: user.email }) : t('Te enviaremos un enlace seguro a tu correo.')}
            onPress={sendReset}
            loading={sendingReset}
          />
        </ListGroup>

        <ListGroup title={t('Zona de riesgo')}>
          <ListRow icon={Trash2} label={t('Eliminar mi cuenta')} destructive description={t('Borra tu perfil, tus momentos y tu actividad social.')} onPress={() => setDeleteOpen(true)} />
        </ListGroup>
      </LargeTitleScroll>

      {deleteOpen ? (
        <Sheet
          visible
          onClose={() => {
            setDeleteOpen(false);
            setSecret('');
            setError(null);
          }}>
          <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
            <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 18 }}>{t('¿Eliminar tu cuenta?')}</AppText>
            <AppText variant="body" tone="muted">
              {t('Se borran tu perfil, fotos, momentos, mensajes, reacciones y seguidores, y se cierra tu sesión en todos tus dispositivos. Tus pedidos y resultados oficiales de eventos se conservan de forma anónima. Esto no se puede deshacer.')}
            </AppText>
            {socialMode ? (
              <FormInput label={t('Escribe {word} para confirmar', { word: deleteConfirmationWord() })} autoCapitalize="characters" value={secret} onChangeText={setSecret} />
            ) : (
              <FormInput label={t('Tu contraseña')} kind="password" value={secret} onChangeText={setSecret} />
            )}
            <AppButton
              label={socialMode ? t('Confirmar con mi contraseña') : t('No tengo contraseña')}
              variant="ghost"
              size="sm"
              onPress={() => {
                setSocialMode((v) => !v);
                setSecret('');
                setError(null);
              }}
            />
            <InlineError message={error} />
            <AppButton label={t('Eliminar mi cuenta')} variant="destructive" size="md" loading={deleting} onPress={confirmDelete} />
          </View>
        </Sheet>
      ) : null}
    </View>
  );
}
