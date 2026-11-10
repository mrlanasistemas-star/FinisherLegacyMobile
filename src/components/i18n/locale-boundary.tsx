/**
 * Remounts its children when the app language changes.
 *
 * Components that take `t` from `useI18n()` already re-render on their own.
 * This boundary covers everything else — copy functions, date / money
 * formatters and other helpers whose result the React Compiler memoizes
 * without knowing it depends on the language. Navigators use it as their
 * `screenLayout`, so each SCREEN is remounted while the navigation state
 * (which screen you are on, the back stack) is left untouched:
 *
 *     <Stack screenLayout={localeScreenLayout}>
 *
 * Never wrap a navigator in it: remounting a navigator resets its state.
 */
import { Fragment, type ReactElement, type ReactNode } from 'react';

import { useLocale } from '@/i18n';

export function LocaleBoundary({ children }: { children: ReactNode }) {
  const locale = useLocale();

  return <Fragment key={locale}>{children}</Fragment>;
}

/** Route names that render a nested navigator (they carry their own boundary). */
const NAVIGATOR_ROUTES = new Set(['(tabs)', '(auth)', 'settings']);

/** `screenLayout` for expo-router navigators. */
export function localeScreenLayout({ children, route }: { children: ReactElement; route: { name: string } }): ReactElement {
  if (NAVIGATOR_ROUTES.has(route.name)) {
    return children;
  }

  return <LocaleBoundary>{children}</LocaleBoundary>;
}
