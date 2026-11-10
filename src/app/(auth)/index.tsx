import { Redirect } from 'expo-router';

/** Signed-out entry: one light welcome (intro + account CTAs). The old multi-screen onboarding was folded into it. */
export default function AuthIndex() {
  return <Redirect href="/welcome" />;
}
