import * as WebBrowser from 'expo-web-browser';
import { ExternalLink } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { colors, spacing } from '@/theme/tokens';

export default function PrivacyScreen() {
  return (
    <Screen scroll>
      <ScreenHeader title="Privacidad" />

      <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
        <Card onPress={() => WebBrowser.openBrowserAsync('https://finisherlegacy.com/privacy')}>
          <Row label="Política de privacidad" />
        </Card>
        <Card onPress={() => WebBrowser.openBrowserAsync('https://finisherlegacy.com/terms')}>
          <Row label="Términos y condiciones" />
        </Card>
      </View>
    </Screen>
  );
}

function Row({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <AppText variant="bodyStrong" style={{ flex: 1 }}>
        {label}
      </AppText>
      <ExternalLink color={colors.muted} size={18} />
    </View>
  );
}
