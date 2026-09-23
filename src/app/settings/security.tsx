import { useQueryClient } from '@tanstack/react-query';
import { KeyRound, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { deleteAccount, requestPasswordReset } from '@/api/account';
import { AppError } from '@/api/errors';
import { tokenStorage } from '@/api/secureStore';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { FormInput } from '@/components/form-input';
import { InlineError } from '@/components/ui/inline-error';
import { ListRow } from '@/components/ui/list-row';
import { Sheet } from '@/components/ui/sheet';
import { TopBar } from '@/components/ui/top-bar';
import { useAuthStore } from '@/stores/authStore';
import { showToast } from '@/stores/toastStore';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import { ensureOnline } from '@/utils/network';

export default function SecurityScreen() {
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
      showToast(`Te enviamos un enlace a ${user.email}.`, 'success');
    } catch (caught) {
      showToast(caught instanceof AppError ? caught.message : 'No pudimos enviar el correo. Intenta otra vez.', 'destructive');
    } finally {
      setSendingReset(false);
    }
  }

  async function confirmDelete() {
    setError(null);
    if (!secret.trim()) {
      setError(socialMode ? 'Escribe ELIMINAR para confirmar.' : 'Escribe tu contraseña para confirmar.');
      return;
    }
    setDeleting(true);
    try {
      await ensureOnline();
      await deleteAccount(socialMode ? { confirmation: secret.trim().toUpperCase() === 'ELIMINAR' ? 'ELIMINAR' : undefined } : { password: secret });
      await tokenStorage.clear();
      queryClient.clear();
      useAuthStore.getState().clearSession();
      showToast('Tu cuenta fue eliminada. Gracias por correr con nosotros.', 'default');
    } catch (caught) {
      const message =
        caught instanceof AppError
          ? (caught.fieldErrors?.password?.[0] ?? caught.fieldErrors?.confirmation?.[0] ?? caught.message)
          : 'No pudimos eliminar tu cuenta. Intenta otra vez.';
      setError(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.black }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <TopBar title="Contraseña y cuenta" />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl }}>
        <View>
          <AppText variant="label" tone="muted" style={{ marginBottom: spacing.xxs }}>
            CONTRASEÑA
          </AppText>
          <ListRow
            icon={KeyRound}
            label="Cambiar contraseña"
            description={`Te enviaremos un enlace seguro a ${user?.email ?? 'tu correo'}.`}
            onPress={sendReset}
            loading={sendingReset}
            divider={false}
          />
        </View>

        <View>
          <AppText variant="label" tone="muted" style={{ marginBottom: spacing.xxs }}>
            ZONA DE RIESGO
          </AppText>
          <ListRow icon={Trash2} label="Eliminar mi cuenta" destructive description="Borra tu perfil, tus momentos y tu actividad social." onPress={() => setDeleteOpen(true)} divider={false} />
        </View>
      </ScrollView>

      {deleteOpen ? (
        <Sheet
          visible
          onClose={() => {
            setDeleteOpen(false);
            setSecret('');
            setError(null);
          }}>
          <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
            <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 18 }}>¿Eliminar tu cuenta?</AppText>
            <AppText variant="body" tone="muted">
              Se borran tu perfil, fotos, momentos, mensajes, reacciones y seguidores, y se cierra tu sesión en todos tus dispositivos. Tus pedidos y resultados oficiales de eventos se conservan de forma anónima. Esto no se puede deshacer.
            </AppText>
            {socialMode ? (
              <FormInput label="Escribe ELIMINAR para confirmar" autoCapitalize="characters" value={secret} onChangeText={setSecret} />
            ) : (
              <FormInput label="Tu contraseña" kind="password" value={secret} onChangeText={setSecret} />
            )}
            <AppButton
              label={socialMode ? 'Uso contraseña' : 'Entré con Google o Apple'}
              variant="ghost"
              size="sm"
              onPress={() => {
                setSocialMode((v) => !v);
                setSecret('');
                setError(null);
              }}
            />
            <InlineError message={error} />
            <AppButton label="Eliminar mi cuenta" variant="destructive" size="md" loading={deleting} onPress={confirmDelete} />
          </View>
        </Sheet>
      ) : null}
    </SafeAreaView>
  );
}
