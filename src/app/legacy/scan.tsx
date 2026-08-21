import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Flashlight, FlashlightOff } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { FormInput } from '@/components/form-input';
import { Screen } from '@/components/screen';
import { extractLegacyCode, normalizeManualCode } from '@/api/legacyCodes';
import { colors, radius, spacing } from '@/theme/tokens';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const locked = useRef(false);

  function goToCode(rawCode: string) {
    if (locked.current) return;
    locked.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.push(`/legacy/${rawCode}`);
    setTimeout(() => {
      locked.current = false;
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
    <Screen padded={false} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Volver">
          <ChevronLeft color={colors.foreground} size={26} />
        </Pressable>
        <AppText variant="subtitle">Escanear Legacy Code</AppText>
        <Pressable
          onPress={() => setTorchOn((prev) => !prev)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={torchOn ? 'Apagar linterna' : 'Encender linterna'}>
          {torchOn ? <FlashlightOff color={colors.gold} size={22} /> : <Flashlight color={colors.foreground} size={22} />}
        </Pressable>
      </View>

      {!permission ? null : !permission.granted ? (
        <View style={styles.permissionBox}>
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
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torchOn}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View pointerEvents="none" style={styles.overlay}>
            <View style={styles.frame} />
          </View>
        </View>
      )}

      <View style={styles.footer}>
        {manualMode ? (
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
        ) : (
          <AppButton
            label="Ingresar código manualmente"
            variant="secondary"
            onPress={() => setManualMode(true)}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 240,
    height: 240,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.gold,
  },
  footer: {
    padding: spacing.lg,
  },
});
