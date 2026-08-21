import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Flashlight, FlashlightOff, KeyRound, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { GlassSurface } from '@/components/brand/glass-surface';
import { FormInput } from '@/components/form-input';
import { extractLegacyCode, normalizeManualCode } from '@/api/legacyCodes';
import { colors, radius, spacing } from '@/theme/tokens';

const FRAME_SIZE = 250;
const CORNER = 32;

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [detected, setDetected] = useState(false);
  const insets = useSafeAreaInsets();
  const locked = useRef(false);
  const scanLine = useSharedValue(0);

  useEffect(() => {
    scanLine.value = withRepeat(
      withSequence(withTiming(1, { duration: 1800 }), withTiming(0, { duration: 1800 })),
      -1,
    );
  }, [scanLine]);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLine.value * (FRAME_SIZE - 2) }],
    opacity: 0.7,
  }));

  function goToCode(rawCode: string) {
    if (locked.current) return;
    locked.current = true;
    setDetected(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.push(`/legacy/${rawCode}`);
    setTimeout(() => {
      locked.current = false;
      setDetected(false);
    }, 1500);
  }

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    const code = extractLegacyCode(result.data);
    if (!code) return;
    goToCode(code);
  }

  function submitManualCode() {
    const normalized = normalizeManualCode(manualCode);
    if (normalized.length < 4) return;
    goToCode(normalized);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      {!permission ? null : !permission.granted ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, paddingTop: insets.top }}>
          <AppText variant="subtitle" align="center">
            Necesitamos tu cámara
          </AppText>
          <AppText variant="body" tone="muted" align="center" style={{ marginTop: spacing.xs }}>
            Finisher Legacy necesita acceso a tu cámara para escanear el código QR de tu Legacy.
          </AppText>
          {permission.canAskAgain ? (
            <AppButton label="Permitir acceso" onPress={requestPermission} style={{ marginTop: spacing.lg }} />
          ) : (
            <AppButton label="Abrir Configuración" onPress={() => Linking.openSettings()} style={{ marginTop: spacing.lg }} />
          )}
          <AppButton label="Cerrar" variant="ghost" onPress={() => router.back()} style={{ marginTop: spacing.sm }} />
        </View>
      ) : (
        <>
          <CameraView
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            facing="back"
            enableTorch={torchOn}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />

          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '38%', backgroundColor: 'rgba(10,10,12,0.55)' }} />
          <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%', backgroundColor: 'rgba(10,10,12,0.7)' }} />

          <View style={{ position: 'absolute', top: insets.top + spacing.sm, left: spacing.md, right: spacing.md, flexDirection: 'row', justifyContent: 'space-between' }}>
            <GlassSurface style={{ width: 40, height: 40 }}>
              <Pressable onPress={() => router.back()} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel="Cerrar">
                <X color={colors.foreground} size={20} />
              </Pressable>
            </GlassSurface>
            <GlassSurface style={{ width: 40, height: 40 }}>
              <Pressable
                onPress={() => setTorchOn((prev) => !prev)}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                accessibilityRole="button"
                accessibilityLabel={torchOn ? 'Apagar linterna' : 'Encender linterna'}>
                {torchOn ? <FlashlightOff color={colors.gold} size={18} /> : <Flashlight color={colors.foreground} size={18} />}
              </Pressable>
            </GlassSurface>
          </View>

          <View pointerEvents="none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <AppText variant="label" tone="gold" style={{ letterSpacing: 3, marginBottom: spacing.xxl + spacing.sm }}>
              ENCUENTRA TU LEGACY
            </AppText>

            <View style={{ width: FRAME_SIZE, height: FRAME_SIZE, overflow: 'hidden' }}>
              <Corner style={{ top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }} active={detected} />
              <Corner style={{ top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }} active={detected} />
              <Corner style={{ bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }} active={detected} />
              <Corner style={{ bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }} active={detected} />
              <Animated.View
                style={[
                  { position: 'absolute', left: 8, right: 8, height: 2, backgroundColor: colors.gold, borderRadius: 1 },
                  scanLineStyle,
                ]}
              />
            </View>

            <AppText variant="caption" tone="muted" style={{ marginTop: spacing.lg }}>
              Apunta al código de tu placa
            </AppText>
          </View>

          <View style={{ position: 'absolute', bottom: insets.bottom + spacing.lg, left: spacing.lg, right: spacing.lg }}>
            {manualMode ? (
              <GlassSurface rounded={false} style={{ borderRadius: radius.lg, padding: spacing.md }}>
                <View style={{ gap: spacing.sm }}>
                  <FormInput
                    label="Legacy Code"
                    value={manualCode}
                    onChangeText={(text) => setManualCode(text.toUpperCase())}
                    autoCapitalize="characters"
                    placeholder="Ej. Q8K2MX7P"
                    returnKeyType="done"
                    onSubmitEditing={submitManualCode}
                  />
                  <AppButton label="Buscar" onPress={submitManualCode} />
                </View>
              </GlassSurface>
            ) : (
              <GlassSurface style={{ alignSelf: 'center' }}>
                <Pressable
                  onPress={() => setManualMode(true)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}
                  accessibilityRole="button">
                  <KeyRound color={colors.foreground} size={16} />
                  <AppText variant="bodyStrong">Ingresar código manualmente</AppText>
                </Pressable>
              </GlassSurface>
            )}
          </View>
        </>
      )}
    </View>
  );
}

function Corner({ style, active }: { style: object; active: boolean }) {
  return (
    <View
      style={[
        { position: 'absolute', width: CORNER, height: CORNER, borderColor: active ? colors.gold : colors.white, borderRadius: radius.sm },
        style,
      ]}
    />
  );
}
