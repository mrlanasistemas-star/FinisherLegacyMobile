import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_EDGE = 2000;
const JPEG_QUALITY = 0.8;

/**
 * Caps the longest edge at MAX_EDGE and re-encodes as JPEG at 80% quality —
 * avoids sending a 15MB camera photo when a 2-4MB one looks the same, while
 * respecting orientation (the manipulator context already reads EXIF
 * orientation from the source). Never touches video — no transcoding
 * library is installed or in scope.
 */
export async function compressImage(uri: string, width: number, height: number): Promise<{ uri: string; width: number; height: number }> {
  let context = ImageManipulator.manipulate(uri);

  if (Math.max(width, height) > MAX_EDGE) {
    context = width >= height ? context.resize({ width: MAX_EDGE }) : context.resize({ height: MAX_EDGE });
  }

  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  return { uri: saved.uri, width: saved.width, height: saved.height };
}
