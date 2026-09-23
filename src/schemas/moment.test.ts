import { momentSchema } from './moment';

describe('momentSchema', () => {
  it('accepts a valid training moment', () => {
    const result = momentSchema.safeParse({
      caption: 'Fondo del domingo',
      visibility: 'followers',
      photosCount: 2,
      metrics: { title: 'Fondo', distance: '21,1', duration: '1:45:10' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid durations and distances with human messages', () => {
    const result = momentSchema.safeParse({ visibility: 'public', photosCount: 0, metrics: { distance: 'diez', duration: '99:99' } });
    expect(result.success).toBe(false);
    const messages = result.success ? [] : result.error.issues.map((i) => i.message);
    expect(messages).toContain('Escribe la distancia en kilómetros, por ejemplo 10 o 21.1.');
    expect(messages).toContain('Usa el formato h:mm:ss o mm:ss.');
  });

  it('caps photos and visibility values', () => {
    expect(momentSchema.safeParse({ visibility: 'public', photosCount: 5 }).success).toBe(false);
    expect(momentSchema.safeParse({ visibility: 'everyone', photosCount: 0 }).success).toBe(false);
  });
});
