import { Redirect } from 'expo-router';

/**
 * Placeholder route for the centered scan slot in the tab bar — its button
 * opens `/legacy/scan` directly, so this screen is never shown; if reached
 * by URL it forwards to the scanner.
 */
export default function ScanTabRedirect() {
  return <Redirect href="/legacy/scan" />;
}
