/**
 * Language picker — a grouped list with one row per language the server
 * offers; the active one shows a check. Choosing a row switches the app at
 * once (`setLocale`) and, when signed in, saves it in the account so emails
 * and push match (`PATCH /me/locale`). Renders nothing while only one
 * language is offered.
 *
 * Mount it in a settings screen:
 *
 *     <LanguagePicker />
 */
import { Check, Languages } from 'lucide-react-native';
import { useState } from 'react';

import { saveLocalePreference } from '@/api/i18n';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { useI18n } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/tokens';

export function LanguagePicker() {
  const { t, locale, locales, setLocale } = useI18n();
  const signedIn = useAuthStore((state) => state.status === 'authenticated');
  const [saving, setSaving] = useState<string | null>(null);

  if (locales.length < 2) {
    return null;
  }

  async function choose(code: string) {
    if (code === locale || saving) {
      return;
    }

    setSaving(code);

    try {
      await setLocale(code);

      if (signedIn) {
        // Best effort: the app is already in the new language.
        await saveLocalePreference(code).catch(() => undefined);
      }
    } finally {
      setSaving(null);
    }
  }

  return (
    <ListGroup title={t('Idioma')}>
      {locales.map((option, index) => (
        <ListRow
          key={option.code}
          icon={index === 0 ? Languages : undefined}
          label={option.name}
          loading={saving === option.code}
          onPress={() => void choose(option.code)}
          trailing={option.code === locale ? <Check size={18} color={colors.accent} strokeWidth={2.2} /> : <></>}
        />
      ))}
    </ListGroup>
  );
}
