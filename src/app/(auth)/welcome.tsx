import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { spacing } from '@/theme/tokens';

export default function WelcomeScreen() {
  return (
    <Screen>
      <View style={styles.hero}>
        <Image
          source={require('@/assets/images/brand/logo-horizontal-gold.png')}
          style={styles.logo}
          contentFit="contain"
        />
        <AppText variant="subtitle" tone="muted" align="center" style={{ marginTop: spacing.md }}>
          Tu historia. Tus medallas. Tu Legacy.
        </AppText>
      </View>

      <View style={styles.actions}>
        <AppButton label="Iniciar sesión" onPress={() => router.push('/login')} />
        <AppButton label="Crear cuenta" variant="secondary" onPress={() => router.push('/register')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: 64,
  },
  actions: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
});
