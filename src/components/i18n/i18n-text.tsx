/**
 * ONE translatable sentence with a link (or bold text) in the middle. The
 * sentence is a single string with `{markers}`; each marker is replaced by
 * the node given under the same name, wherever the translation puts it:
 *
 *     <AppText>
 *       <I18nText text={t('¿Ya tienes cuenta? {link}')} slots={{ link: <AppText onPress={…}>{t('Inicia sesión')}</AppText> }} />
 *     </AppText>
 *
 * Never glue pieces (`t('¿Ya tienes cuenta?') + <Link>`): word order changes
 * between languages. `text` is already translated — pass `t('…')` with a
 * LITERAL string so the backend's `i18n:sync` finds it. Renders no wrapper:
 * put it inside the `<Text>` that should carry the style. A marker without a
 * node is left as written.
 */
import { Fragment, type ReactNode } from 'react';

import { splitMarkers } from '@/i18n/text';

/** The pieces of `text`, with each `{marker}` replaced by its node. */
export function renderMarkers(text: string, slots: Record<string, ReactNode>): ReactNode[] {
  return splitMarkers(text, Object.keys(slots)).map((segment, index) => (
    <Fragment key={index}>{segment.type === 'text' ? segment.value : slots[segment.name]}</Fragment>
  ));
}

export function I18nText({ text, slots }: { text: string; slots: Record<string, ReactNode> }) {
  return <>{renderMarkers(text, slots)}</>;
}
