import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText } from './app-text';

import { colors, radius } from '@/theme/tokens';
import { prepareImageUpload } from '@/utils/media-file';

export type PickedImage = { uri: string; name: string; type: string };

interface ImagePickerTileProps {
  label: string;
  value: PickedImage | null;
  existingUrl?: string | null;
  onChange: (image: PickedImage) => void;
  aspect?: [number, number];
  style?: object;
}

export function ImagePickerTile({ label, value, existingUrl, onChange, aspect = [1, 1], style }: ImagePickerTileProps) {
  async function pick() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect,
    });
    if (result.canceled || !result.assets[0]) return;

    // Compressed to JPEG, so the name always ends in .jpg (never
    // "foto.png" labelled image/jpeg — see src/utils/media-file.ts).
    onChange(await prepareImageUpload(result.assets[0], 'medalla'));
  }

  const previewUri = value?.uri ?? existingUrl ?? null;

  return (
    <Pressable
      onPress={pick}
      style={[
        {
          aspectRatio: aspect[0] / aspect[1],
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.graphite,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
      ]}>
      {previewUri ? (
        <Image source={{ uri: previewUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      ) : (
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Camera color={colors.muted} size={22} />
          <AppText variant="caption" tone="muted">
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}
