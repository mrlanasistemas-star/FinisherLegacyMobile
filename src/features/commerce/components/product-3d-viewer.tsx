import * as WebBrowser from 'expo-web-browser';
import { Box, ExternalLink, RotateCcw, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { IconButton } from '@/components/ui/icon-button';
import { useI18n } from '@/i18n';
import { colors, spacing } from '@/theme/tokens';

/**
 * Pinned, CDN-hosted model-viewer (Google, Apache-2.0). Loaded only inside
 * this modal — nothing 3D is downloaded until the athlete asks for it.
 */
const MODEL_VIEWER_SRC = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js';

/** Only https model/poster URLs ever reach the page. */
export function isSafeMediaUrl(url: string | null | undefined): url is string {
  return typeof url === 'string' && /^https:\/\/[^\s"'<>]+$/i.test(url);
}

/**
 * The HTML is static; the URLs are injected as JSON and assigned as
 * properties (never interpolated into markup), so a hostile URL can't
 * break out into script.
 */
export function buildModelViewerHtml(modelUrl: string, posterUrl: string | null, alt: string): string {
  const config = JSON.stringify({ src: modelUrl, poster: isSafeMediaUrl(posterUrl) ? posterUrl : null, alt }).replace(/</g, '\\u003c');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;height:100%;background:${colors.background};overflow:hidden}model-viewer{width:100%;height:100%;--poster-color:transparent;background:radial-gradient(circle at 50% 40%,#FFFFFF 0%,${colors.background} 70%)}</style>
<script type="module" src="${MODEL_VIEWER_SRC}"></script></head><body>
<model-viewer id="mv" camera-controls touch-action="pan-y" auto-rotate auto-rotate-delay="1200" rotation-per-second="18deg" interaction-prompt="auto" shadow-intensity="0.8" exposure="1.05" environment-image="neutral"></model-viewer>
<script>
var c=${config};var mv=document.getElementById('mv');
mv.setAttribute('alt',c.alt||'Modelo 3D');if(c.poster){mv.setAttribute('poster',c.poster);}mv.setAttribute('src',c.src);
function post(t){try{window.ReactNativeWebView.postMessage(t)}catch(e){}}
mv.addEventListener('load',function(){post('loaded')});mv.addEventListener('error',function(){post('error')});
window.__resetCamera=function(){mv.cameraOrbit='0deg 75deg 105%';mv.fieldOfView='auto';mv.jumpCameraToGoal();};
setTimeout(function(){if(!customElements.get('model-viewer')){post('error')}},15000);
</script></body></html>`;
}

interface Product3DViewerProps {
  visible: boolean;
  onClose: () => void;
  modelUrl: string;
  posterUrl: string | null;
  productName: string;
  /** Web product page — the fallback if the device can't render the model. */
  webUrl: string;
}

/**
 * Full-screen 3D: drag to orbit, pinch to zoom, reset, gentle auto-rotate.
 * Rendered by @google/model-viewer inside a WebView (react-native-webview is
 * part of the Expo SDK 57 bundle — no custom native code, works in Expo Go
 * and dev builds). If the model fails, the athlete gets the web viewer.
 */
export function Product3DViewer({ visible, onClose, modelUrl, posterUrl, productName, webUrl }: Product3DViewerProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  function onMessage(event: WebViewMessageEvent) {
    if (event.nativeEvent.data === 'loaded') setState('ready');
    if (event.nativeEvent.data === 'error') setState('error');
  }

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent supportedOrientations={['portrait']}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {visible && isSafeMediaUrl(modelUrl) ? (
          <WebView
            ref={webRef}
            source={{ html: buildModelViewerHtml(modelUrl, posterUrl, productName), baseUrl: 'https://finisherlegacy.com' }}
            originWhitelist={['https://*', 'about:*']}
            onShouldStartLoadWithRequest={(request) => request.isTopFrame === false || /^(about:|data:|https:\/\/finisherlegacy\.com\/?$)/.test(request.url)}
            onMessage={onMessage}
            onError={() => setState('error')}
            javaScriptEnabled
            allowFileAccess={false}
            allowsInlineMediaPlayback
            setSupportMultipleWindows={false}
            style={{ flex: 1, backgroundColor: colors.background }}
            containerStyle={{ backgroundColor: colors.background }}
            accessibilityLabel={t('Modelo 3D de {name}. Arrastra para girarlo y pellizca para acercar.', { name: productName })}
          />
        ) : null}

        {state === 'loading' ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
            <ActivityIndicator color={colors.accent} />
            <AppText variant="caption" tone="muted">
              {t('Preparando la vista 3D…')}
            </AppText>
          </View>
        ) : null}

        {state === 'error' || !isSafeMediaUrl(modelUrl) ? (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: colors.background }}>
            <Box size={40} color={colors.accent} strokeWidth={1.4} />
            <AppText variant="subtitle" align="center">
              {t('No pudimos mostrar el modelo aquí')}
            </AppText>
            <AppText variant="body" tone="muted" align="center">
              {t('Puedes verlo en 3D desde la web.')}
            </AppText>
            <AppButton label={t('Ver en 3D en la web')} icon={ExternalLink} variant="secondary" fullWidth={false} onPress={() => WebBrowser.openBrowserAsync(webUrl).catch(() => {})} />
          </View>
        ) : null}

        <View style={{ position: 'absolute', top: insets.top + spacing.xs, left: spacing.sm, right: spacing.sm, flexDirection: 'row', justifyContent: 'space-between' }}>
          <IconButton icon={X} label={t('Cerrar vista 3D')} onPress={onClose} filled />
          {state === 'ready' ? (
            <IconButton icon={RotateCcw} label={t('Restablecer vista')} onPress={() => webRef.current?.injectJavaScript('window.__resetCamera && window.__resetCamera(); true;')} filled />
          ) : null}
        </View>

        {state === 'ready' ? (
          <View pointerEvents="none" style={{ position: 'absolute', bottom: insets.bottom + spacing.lg, left: 0, right: 0, alignItems: 'center' }}>
            <AppText variant="caption" tone="muted">
              {t('Arrastra para girar · pellizca para acercar')}
            </AppText>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
