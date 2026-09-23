import { jpegFileName, normalizeVideoMime, videoFileName } from './media-file';

jest.mock('@/utils/image-compress', () => ({ compressImage: jest.fn() }));

describe('jpegFileName', () => {
  it('always ends in .jpg, whatever the source extension', () => {
    expect(jpegFileName('foto.png')).toBe('foto.jpg');
    expect(jpegFileName('IMG_0001.HEIC')).toBe('IMG_0001.jpg');
    expect(jpegFileName('already.jpg')).toBe('already.jpg');
  });

  it('sanitizes odd characters and falls back when there is no name', () => {
    expect(jpegFileName('mi foto (1).png')).toBe('mi-foto-1.jpg');
    expect(jpegFileName(null, 'avatar')).toMatch(/^avatar-\d+\.jpg$/);
  });
});

describe('video naming', () => {
  it('maps iOS quicktime to .mov and keeps name/MIME consistent', () => {
    const mime = normalizeVideoMime('video/quicktime', 'IMG_1.MOV');
    expect(mime).toBe('video/quicktime');
    expect(videoFileName('IMG_1.MOV', mime)).toBe('IMG_1.mov');
  });

  it('treats a missing MIME on a .mov file as quicktime', () => {
    expect(normalizeVideoMime(undefined, 'clip.mov')).toBe('video/quicktime');
  });

  it('defaults to mp4', () => {
    expect(normalizeVideoMime('video/mp4', 'clip.mp4')).toBe('video/mp4');
    expect(videoFileName(undefined, 'video/mp4', 'evento')).toMatch(/^evento-\d+\.mp4$/);
  });
});
