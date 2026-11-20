import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { AppText } from '@/components/app-text';
import { useI18n } from '@/i18n';
import { colors, radius, spacing } from '@/theme/tokens';

/**
 * The family live map: Leaflet + OpenStreetMap tiles inside a WebView (the
 * app ships no native map SDK; react-native-webview is already a
 * dependency). Same tiles/attribution as the web live page. The page is
 * built once; new positions are pushed with `injectJavaScript`, so polling
 * never reloads the tiles. Draws only what the server sent (recent path +
 * current point) — nothing is stored on the phone.
 */

const LEAFLET_VERSION = '1.9.4';

function buildHtml(): string {
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css">
<style>html,body,#map{margin:0;height:100%;background:${colors.background}}
.dot{width:18px;height:18px;border-radius:50%;background:${colors.black};border:3px solid ${colors.gold};box-shadow:0 0 0 6px rgba(201,174,139,.25)}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js"></script>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:true}).setView([19.43,-99.13],12);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
var line=L.polyline([],{color:'${colors.black}',weight:4,opacity:.8}).addTo(map);
var marker=null,fitted=false;
window.flUpdate=function(d){
  line.setLatLngs(d.path||[]);
  if(d.current){
    var ll=[d.current.lat,d.current.lng];
    if(!marker){marker=L.marker(ll,{icon:L.divIcon({className:'',html:'<div class="dot"></div>',iconSize:[18,18],iconAnchor:[9,9]})}).addTo(map);}
    else{marker.setLatLng(ll);}
    if(!fitted){(d.path&&d.path.length>1)?map.fitBounds(line.getBounds(),{padding:[32,32],maxZoom:16}):map.setView(ll,15);fitted=true;}
  }
};
window.flRecenter=function(){if(marker){map.setView(marker.getLatLng(),Math.max(map.getZoom(),15));}};
try{window.ReactNativeWebView.postMessage('ready')}catch(e){}
</script></body></html>`;
}

export interface LiveMapProps {
  path: [number, number][];
  current: { lat: number; lng: number } | null;
  height?: number;
  /** Bumped by the parent to recenter on the current point. */
  recenterKey?: number;
}

export function LiveMap({ path, current, height = 320, recenterKey = 0 }: LiveMapProps) {
  const { t } = useI18n();
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const html = useMemo(() => buildHtml(), []);

  useEffect(() => {
    if (!ready) return;
    const payload = JSON.stringify({ path, current });
    webRef.current?.injectJavaScript(`window.flUpdate && window.flUpdate(${payload}); true;`);
  }, [ready, path, current]);

  useEffect(() => {
    if (ready && recenterKey > 0) webRef.current?.injectJavaScript('window.flRecenter && window.flRecenter(); true;');
  }, [ready, recenterKey]);

  return (
    <View
      style={{ height, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surfaceMuted }}
      accessible
      accessibilityLabel={current ? t('Mapa con su posición actual') : t('Mapa sin posición todavía')}>
      {failed ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <AppText variant="caption" tone="muted" align="center">
            {t('No pudimos cargar el mapa. Revisa tu conexión.')}
          </AppText>
        </View>
      ) : (
        <WebView
          ref={webRef}
          source={{ html, baseUrl: 'https://finisherlegacy.com' }}
          originWhitelist={['https://*', 'about:*']}
          onMessage={(event) => {
            if (event.nativeEvent.data === 'ready') setReady(true);
          }}
          onError={() => setFailed(true)}
          javaScriptEnabled
          scrollEnabled={false}
          setSupportMultipleWindows={false}
          style={{ backgroundColor: 'transparent' }}
        />
      )}
    </View>
  );
}
