/**
 * Switching the language while the app is open: components that take `t`
 * from `useI18n()` re-render in the new language, copy functions (the
 * former module-level tables) answer in it, dates / money follow it, and
 * `LocaleBoundary` remounts what cannot know it depends on the language.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { Text } from 'react-native';
import { act, create as createRenderer, type ReactTestRenderer } from 'react-test-renderer';

import { LocaleBoundary } from '@/components/i18n/locale-boundary';
import { paymentPhaseCopy } from '@/payments/payment-flow';
import { loginSchema } from '@/schemas/auth';
import { describeCommerceError } from '@/utils/commerce-errors';
import { formatLongDate } from '@/utils/dates';
import { formatMoney } from '@/utils/money';
import { relativeTime, timeBucketLabel } from '@/utils/relative-time';
import { describeSupportStatus } from '@/utils/support-status';
import { AppError } from '@/api/errors';

import { initializeI18n, refreshCatalog, resetI18nForTests, setLocale, useI18n, useLocale, useT } from './index';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ENGLISH = {
  'Mis historias': 'My stories',
  'Hola, {name}': 'Hi, {name}',
  '{count} foto|{count} fotos': '{count} photo|{count} photos',
  'Pago confirmado': 'Payment confirmed',
  'Listo. Tu pedido ya es parte de tu Legacy.': 'Done. Your order is now part of your Legacy.',
  Completada: 'Completed',
  'Este cupón ya venció.': 'This coupon has expired.',
  'Ingresa tu correo.': 'Enter your email.',
  Hoy: 'Today',
  'hace {minutes} min': '{minutes} min ago',
};

async function seedEnglish(messages: Record<string, string> = ENGLISH, version = 'v1') {
  await AsyncStorage.setItem('fl.i18n.catalog.en', JSON.stringify({ version, messages }));
}

const mounted: ReactTestRenderer[] = [];

function create(element: Parameters<typeof createRenderer>[0]): ReactTestRenderer {
  const renderer = createRenderer(element);
  mounted.push(renderer);

  return renderer;
}

function texts(renderer: ReactTestRenderer): string[] {
  return renderer.root.findAllByType(Text).map((node) => String(node.props.children));
}

beforeEach(async () => {
  await AsyncStorage.clear();
  resetI18nForTests();
  // No network in these tests: the over-the-air refresh simply finds nothing.
  globalThis.fetch = jest.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })) as unknown as typeof fetch;
});

afterEach(() => {
  act(() => {
    mounted.splice(0).forEach((renderer) => renderer.unmount());
  });
  resetI18nForTests();
});

describe('a language switch re-renders components', () => {
  let renders = 0;

  function Greeting({ name }: { name: string }) {
    const { t, tc, locale } = useI18n();
    renders += 1;

    return (
      <>
        <Text>{t('Mis historias')}</Text>
        <Text>{t('Hola, {name}', { name })}</Text>
        <Text>{tc('{count} foto|{count} fotos', 2)}</Text>
        <Text>{locale}</Text>
      </>
    );
  }

  beforeEach(() => {
    renders = 0;
  });

  it('shows Spanish first and English right after setLocale — no restart', async () => {
    await seedEnglish();

    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<Greeting name="Ana" />);
    });

    expect(texts(renderer)).toEqual(['Mis historias', 'Hola, Ana', '2 fotos', 'es']);
    const before = renders;

    await act(async () => {
      await setLocale('en');
    });

    expect(renders).toBeGreaterThan(before);
    expect(texts(renderer)).toEqual(['My stories', 'Hi, Ana', '2 photos', 'en']);

    await act(async () => {
      await setLocale('es');
    });

    expect(texts(renderer)).toEqual(['Mis historias', 'Hola, Ana', '2 fotos', 'es']);
  });

  it('hands out a new `t` when the texts change, and keeps it otherwise', async () => {
    await seedEnglish();
    const seen: unknown[] = [];

    function Probe() {
      seen.push(useT());

      return <Text>{useLocale()}</Text>;
    }

    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<Probe />);
    });
    act(() => {
      renderer.update(<Probe />);
    });

    // Same language, same catalog: the same function (effects depending on it do not re-run).
    expect(seen[seen.length - 1]).toBe(seen[0]);

    await act(async () => {
      await setLocale('en');
    });

    // New language: a new function, so memoized output that used it is recomputed.
    expect(seen[seen.length - 1]).not.toBe(seen[0]);
    expect(texts(renderer)).toEqual(['en']);
  });

  it('re-renders when a newer catalog arrives over the air', async () => {
    await seedEnglish({ 'Mis historias': 'My stories (old)' }, 'v1');

    let renderer!: ReactTestRenderer;
    await act(async () => {
      await setLocale('en');
      renderer = create(<Greeting name="Ana" />);
    });

    expect(texts(renderer)[0]).toBe('My stories (old)');

    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: { locale: 'en', version: 'v2', messages: ENGLISH } }),
    })) as unknown as typeof fetch;

    await act(async () => {
      expect(await refreshCatalog()).toBe(true);
    });

    expect(texts(renderer)[0]).toBe('My stories');
  });

  it('LocaleBoundary remounts its children on a language change (and only then)', async () => {
    await seedEnglish();
    let mounts = 0;

    function Screen() {
      // State created on mount: a remount is the only way it runs again.
      const [label] = useState(() => {
        mounts += 1;

        return timeBucketLabel('today');
      });

      return <Text>{label}</Text>;
    }

    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <LocaleBoundary>
          <Screen />
        </LocaleBoundary>,
      );
    });

    expect(texts(renderer)).toEqual(['Hoy']);
    expect(mounts).toBe(1);

    await act(async () => {
      await setLocale('en');
    });

    expect(mounts).toBe(2);
    expect(texts(renderer)).toEqual(['Today']);
  });
});

describe('copy functions answer in the active language', () => {
  it('returns Spanish by default and English when the catalog has it', async () => {
    expect(paymentPhaseCopy('paid')).toEqual({ title: 'Pago confirmado', message: 'Listo. Tu pedido ya es parte de tu Legacy.' });
    expect(describeSupportStatus('completed').label).toBe('Completada');

    await seedEnglish();
    await setLocale('en');

    expect(paymentPhaseCopy('paid')).toEqual({ title: 'Payment confirmed', message: 'Done. Your order is now part of your Legacy.' });
    expect(describeSupportStatus('completed')).toEqual({ label: 'Completed', variant: 'success' });
    expect(timeBucketLabel('today')).toBe('Today');
    expect(
      describeCommerceError(new AppError({ kind: 'business_rule', code: 'COUPON_NOT_APPLICABLE', message: 'x', details: { reason: 'expired' } })),
    ).toBe('This coupon has expired.');
    expect(relativeTime('2026-01-01T10:00:00Z', new Date('2026-01-01T10:05:00Z'))).toBe('5 min ago');
  });

  it('falls back to the Spanish original for copy that is not translated yet', async () => {
    await seedEnglish();
    await setLocale('en');

    // Not in the catalog: never empty, never a key.
    expect(paymentPhaseCopy('failed').title).toBe('El pago no se completó');
    expect(describeSupportStatus('draft').label).toBe('Borrador');
  });

  it('resolves validation messages when the form is validated, not when the schema is imported', async () => {
    const invalid = { email: '', password: 'x' };

    expect(loginSchema.safeParse(invalid).error?.issues[0]?.message).toBe('Ingresa tu correo.');

    await seedEnglish();
    await setLocale('en');

    expect(loginSchema.safeParse(invalid).error?.issues[0]?.message).toBe('Enter your email.');
  });

  it('formats dates and money in the active language (the currency does not change)', async () => {
    expect(formatLongDate('2026-03-05')).toMatch(/marzo/);
    const spanish = formatMoney(123456, 'MXN');

    await seedEnglish();
    await setLocale('en');

    expect(formatLongDate('2026-03-05')).toMatch(/March/);
    expect(formatMoney(123456, 'MXN')).toMatch(/1,234\.56/);
    expect(formatMoney(123456, 'MXN')).toMatch(/MX\$|MXN/);
    expect(spanish).toMatch(/1,234\.56/);
  });
});

describe('startup', () => {
  it('opens in Spanish when storage fails — never throws', async () => {
    const getItem = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('storage is broken'));

    await expect(initializeI18n()).resolves.toBeUndefined();
    expect(paymentPhaseCopy('paid').title).toBe('Pago confirmado');

    getItem.mockRestore();
  });
});
