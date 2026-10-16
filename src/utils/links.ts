/**
 * Public web origin for share links and universal links. Configurable per
 * build (`EXPO_PUBLIC_WEB_URL`, e.g. a staging domain); production default
 * is the real site. Must match the domain in app.config.ts associatedDomains.
 */
export const WEB_ORIGIN = (process.env.EXPO_PUBLIC_WEB_URL || 'https://finisherlegacy.com').replace(/\/+$/, '');

export const webLinks = {
  athlete: (username: string) => `${WEB_ORIGIN}/@${username}`,
  moment: (uuid: string) => `${WEB_ORIGIN}/moments/${uuid}`,
  event: (slug: string) => `${WEB_ORIGIN}/events/${slug}`,
};
