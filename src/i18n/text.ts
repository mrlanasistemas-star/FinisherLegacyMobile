/**
 * Pure text rules of the translator — the same ones as the website's
 * `resources/js/i18n/text.ts` (backend docs: docs/renovacion/idiomas.md
 * §Notas para quien traduce, §Frases con enlaces, §Ordinales).
 */

/**
 * Separates a source string from its translator note:
 *
 *     t('Nombre||nombre completo del atleta')
 *
 * The note tells the translator WHICH "Nombre" this is. It is part of the
 * key (two contexts → two translations) and is never shown, in any
 * language — Spanish included.
 */
export const NOTE_SEPARATOR = '||';

/** `"Nombre||nombre completo"` → `"Nombre"`. */
export function stripNote(text: string): string {
  const at = text.indexOf(NOTE_SEPARATOR);

  return at === -1 ? text : text.slice(0, at).trimEnd();
}

export type Segment = { type: 'text'; value: string } | { type: 'slot'; name: string };

/**
 * Cuts a translated sentence at its `{marker}`s so a screen can put a link
 * or bold text in the middle of ONE translatable string:
 *
 *     splitMarkers('¿Ya tienes cuenta? {link}', ['link'])
 *     → [{ type: 'text', value: '¿Ya tienes cuenta? ' }, { type: 'slot', name: 'link' }]
 *
 * Only the listed names are cut out (any `{marker}` when no list is given);
 * the order is whatever the translation says.
 */
export function splitMarkers(text: string, names?: string[]): Segment[] {
  const segments: Segment[] = [];
  const pattern = /\{\s*([A-Za-z_][\w.]*)\s*\}/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const name = match[1];

    if (names && !names.includes(name)) {
      continue;
    }

    if (match.index > last) {
      segments.push({ type: 'text', value: text.slice(last, match.index) });
    }

    segments.push({ type: 'slot', name });
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    segments.push({ type: 'text', value: text.slice(last) });
  }

  return segments;
}

/**
 * A place as people write it: Spanish "1.º", English "1st". Other languages
 * get a plain "1." until someone adds their rule here.
 */
export function ordinal(value: number, locale: string): string {
  const language = locale.slice(0, 2).toLowerCase();

  if (language === 'es') {
    return `${value}.º`;
  }

  if (language === 'en') {
    const tens = Math.abs(value) % 100;
    const suffix = tens >= 11 && tens <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][Math.abs(value) % 10] ?? 'th');

    return `${value}${suffix}`;
  }

  return `${value}.`;
}
