import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { socialSignIn, type SocialProvider } from '@/api/account';
import { AppError } from '@/api/errors';
import { tokenStorage } from '@/api/secureStore';
import { GoogleGlyph } from '@/components/ui/google-glyph';
import { OrDivider } from '@/components/ui/or-divider';
import { SocialButton } from '@/components/ui/social-button';
import { useAuthStore } from '@/stores/authStore';
import { showToast } from '@/stores/toastStore';
import { spacing } from '@/theme/tokens';
import type { AuthPayload } from '@/types/auth';
import { env } from '@/utils/env';

WebBrowser.maybeCompleteAuthSession();

async function finishSession(payload: AuthPayload & { created: boolean }) {
  await tokenStorage.set(payload.token);
  useAuthStore.getState().setSession(payload.user, payload.token);
  showToast(payload.created ? 'Tu Legacy comienza aquí.' : `Qué bueno verte, ${payload.user.first_name}.`, 'success');
}

function reportError(provider: SocialProvider, error: unknown) {
  const fallback = provider === 'apple' ? 'No pudimos entrar con Apple. Intenta otra vez.' : 'No pudimos entrar con Google. Intenta otra vez.';
  showToast(error instanceof AppError ? error.message : fallback, 'destructive');
}

const googleClientForPlatform = Platform.select({ ios: env.googleIosClientId, android: env.googleAndroidClientId, default: env.googleWebClientId });

/**
 * "Continuar con Google / Apple" — only the providers that are really
 * configured render (Apple: iOS with Sign in with Apple available; Google:
 * a client id for this platform). Nothing fake: the ID token is verified
 * by the backend, which issues the same Sanctum token as password login.
 */
export function SocialSignInButtons({ label = 'o continúa con' }: { label?: string }) {
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  const googleAvailable = !!googleClientForPlatform;
  if (!appleAvailable && !googleAvailable) return null;

  return (
    <View style={{ gap: spacing.sm }}>
      <OrDivider label={label} />
      {appleAvailable ? <AppleButton /> : null}
      {googleAvailable ? <GoogleButton /> : null}
    </View>
  );
}

function AppleButton() {
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    try {
      // Apple embeds sha256(nonce) in the token; the backend receives the
      // raw nonce and checks it — a replayed token from elsewhere fails.
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce: hashedNonce,
      });
      if (!credential.identityToken) throw new Error('missing token');
      const payload = await socialSignIn('apple', {
        id_token: credential.identityToken,
        nonce: rawNonce,
        given_name: credential.fullName?.givenName ?? null,
        family_name: credential.fullName?.familyName ?? null,
      });
      await finishSession(payload);
    } catch (error) {
      if ((error as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
      reportError('apple', error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
      cornerRadius={14}
      style={{ height: 50, width: '100%', opacity: busy ? 0.6 : 1 }}
      onPress={busy ? () => {} : signIn}
    />
  );
}

function GoogleButton() {
  const [busy, setBusy] = useState(false);
  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: env.googleIosClientId,
    androidClientId: env.googleAndroidClientId,
    webClientId: env.googleWebClientId,
  });

  async function signIn() {
    setBusy(true);
    try {
      const result = await promptAsync();
      if (result.type !== 'success') return; // dismissed / cancelled
      const idToken = result.params.id_token;
      if (!idToken) throw new Error('missing id_token');
      await finishSession(await socialSignIn('google', { id_token: idToken }));
    } catch (error) {
      reportError('google', error);
    } finally {
      setBusy(false);
    }
  }

  return <SocialButton label="Continuar con Google" icon={<GoogleGlyph />} disabled={!request || busy} onPress={signIn} />;
}
