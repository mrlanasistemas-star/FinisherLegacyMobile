import Constants from 'expo-constants';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { ExternalLink, Globe, Mail } from 'lucide-react-native';
import { Linking, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { LargeTitleScroll } from '@/components/ui/top-bar';
import { colors, spacing } from '@/theme/tokens';
import { legalLinks } from '@/utils/links';
import { useI18n } from '@/i18n';

export default function AboutScreen() {
  const { t } = useI18n();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <LargeTitleScroll title={t('Acerca de')} contentContainerStyle={{ gap: spacing.lg }}>
      <View style={{ alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm }}>
        {/* FL monogram artwork (2.2:1), shown once, no glow. */}
        <Image source={require('@/assets/images/brand/fl-monograma.png')} style={{ width: 110, height: 50 }} contentFit="contain" accessibilityLabel="Finisher Legacy" />
        <AppText variant="subtitle" style={{ letterSpacing: 0.5 }}>
          {t('Haz que perdure.')}
        </AppText>
        <AppText variant="caption" tone="muted" align="center" style={{ maxWidth: 300 }}>
          {t('Convertimos cada logro deportivo en una historia que se conserva, se revive y se comparte.')}
        </AppText>
        <AppText variant="caption" tone="subtle">
          {t('Versión {version}', { version })}
        </AppText>
      </View>

      <ListGroup>
        <ListRow icon={Mail} label={t('Contactar soporte')} description="hola@finisherlegacy.com" onPress={() => Linking.openURL('mailto:hola@finisherlegacy.com')} />
        <ListRow
          icon={Globe}
          label="finisherlegacy.com"
          trailing={<ExternalLink size={16} color={colors.subtle} />}
          onPress={() => WebBrowser.openBrowserAsync('https://finisherlegacy.com')}
        />
      </ListGroup>

      <ListGroup title={t('Legal')}>
        <ListRow label={t('Política de privacidad')} trailing={<ExternalLink size={16} color={colors.subtle} />} onPress={() => WebBrowser.openBrowserAsync(legalLinks.privacy)} />
        <ListRow label={t('Términos y condiciones')} trailing={<ExternalLink size={16} color={colors.subtle} />} onPress={() => WebBrowser.openBrowserAsync(legalLinks.terms)} />
      </ListGroup>
    </LargeTitleScroll>
  );
}
