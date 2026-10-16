import { router } from 'expo-router';
import { KeyRound, Nfc, X } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { extractLegacyCode, normalizeManualCode } from '@/api/legacyCodes';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { FormInput } from '@/components/form-input';
import { IconButton } from '@/components/ui/icon-button';
import { colors, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

/**
 * "Tengo un código impreso" — the route keeps its historical name
 * (`/legacy/scan`) so old links work, but there is no camera scanner any
 * more: new Legacy Plates and products connect by NFC tap. Printed codes
 * from earlier plates/products are still honored by typing them:
 * Legacy Codes → `/legacy/{code}`, product codes (`AST…`) → `/gear/claim`.
 */
export default function EnterCodeScreen() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const normalized = extractLegacyCode(code) ?? normalizeManualCode(code);
    if (normalized.length < 4) {
      setError('Escribe el código completo, tal como aparece impreso.');
      return;
    }
    haptics.success();
    setError(null);
    if (/^AST[A-Z0-9]+$/.test(normalized)) {
      router.replace({ pathname: '/gear/claim', params: { code: normalized } });
    } else {
      router.replace(`/legacy/${normalized}`);
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.black }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.sm }}>
        <IconButton icon={X} label="Cerrar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/legacy'))} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xl }}>
          <View style={{ gap: spacing.xs, marginTop: spacing.md }}>
            <AppText variant="label" tone="gold" style={{ letterSpacing: 3 }}>
              CÓDIGO IMPRESO
            </AppText>
            <AppText variant="title" accessibilityRole="header">
              Agrega tu pieza con su código
            </AppText>
            <AppText variant="body" tone="muted">
              Si tu Legacy Plate o tu producto trae un código impreso, escríbelo aquí para conectarlo a tu historia.
            </AppText>
          </View>

          <View style={{ gap: spacing.sm }}>
            <FormInput
              label="Código"
              icon={KeyRound}
              value={code}
              onChangeText={(text) => {
                setCode(text.toUpperCase());
                if (error) setError(null);
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              placeholder="Ej. Q8K2MX7P"
              returnKeyType="go"
              onSubmitEditing={submit}
              error={error ?? undefined}
            />
            <AppButton label="Continuar" onPress={submit} disabled={code.trim().length < 4} />
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.graphite }}>
            <Nfc size={22} color={colors.gold} />
            <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
              ¿Tu pieza tiene NFC? No necesitas código: acerca tu teléfono a la etiqueta y se abrirá Finisher Legacy.
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
