import Constants from 'expo-constants';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { Linking, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { spacing } from '@/theme/tokens';

export default function AboutScreen() {
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen scroll>
      <ScreenHeader title="Acerca de" />

      <View style={{ alignItems: 'center', marginVertical: spacing.xl, gap: spacing.xs }}>
        <Image
          source={require('@/assets/images/brand/logo-mark-gold.png')}
          style={{ width: 64, height: 64 }}
          contentFit="contain"
        />
        <AppText variant="subtitle">Finisher Legacy</AppText>
        <AppText variant="caption" tone="muted">
          Versión {version}
        </AppText>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Card onPress={() => Linking.openURL('mailto:hola@finisherlegacy.com')}>
          <AppText variant="bodyStrong">Contactar soporte</AppText>
          <AppText variant="caption" tone="muted">
            hola@finisherlegacy.com
          </AppText>
        </Card>
        <Card onPress={() => WebBrowser.openBrowserAsync('https://finisherlegacy.com')}>
          <AppText variant="bodyStrong">finisherlegacy.com</AppText>
        </Card>
      </View>
    </Screen>
  );
}
