#!/usr/bin/env node
/**
 * Publishes an over-the-air update (EAS Update) to the phones that already
 * have a build of the given channel installed.
 *
 *   npm run update:preview -- "Mensaje del cambio"
 *   npm run update:production -- "Mensaje del cambio"
 *
 * Why a script instead of calling `eas update` directly: the JS bundle bakes
 * in every EXPO_PUBLIC_* variable present on THIS machine, and the local
 * `.env` / `.env.local` point the app to `localhost` for development. Values
 * already in the process environment win over the .env files, so they are
 * set here to the same production URLs eas.json gives the builds — an update
 * can never ship a phone pointed at a developer's laptop.
 *
 * Only JavaScript and assets travel in an update. Anything native (a new
 * library with native code, a permission, app.json/app.config.ts plugin
 * changes, the icon or splash) needs a new build; when that happens bump
 * `version` in app.json so old builds stop receiving bundles they cannot run
 * (runtimeVersion policy "appVersion"). Full guide: docs/store/actualizaciones.md.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const isWindows = process.platform === 'win32';
const CHANNELS = ['preview', 'production'];
const channel = process.argv[2];
const message = process.argv.slice(3).join(' ').trim();

if (!CHANNELS.includes(channel)) {
  console.error(`Canal inválido. Usa: ${CHANNELS.join(' | ')}`);
  process.exit(1);
}

if (!message) {
  console.error('Falta el mensaje del cambio, p. ej.: npm run update:preview -- "Corrige el teclado del NIP"');
  process.exit(1);
}

// Same EXPO_PUBLIC_* values the build profile of this channel uses.
const profileEnv = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8')).build?.[channel]?.env ?? {};
const env = { ...process.env, ...profileEnv };

for (const [key, value] of Object.entries(profileEnv)) {
  console.log(`${key}=${value}`);
}

const result = spawnSync(
  'npx',
  // On Windows `npx` is a .cmd and needs a shell, which joins the arguments:
  // the message is quoted so its spaces survive.
  ['eas-cli@latest', 'update', '--channel', channel, '--environment', channel, '--message', isWindows ? JSON.stringify(message.replaceAll('"', "'")) : message, '--non-interactive'],
  { stdio: 'inherit', env, shell: isWindows },
);

process.exit(result.status ?? 1);
