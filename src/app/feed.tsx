import { Redirect } from 'expo-router';

/**
 * The community feed now lives in the Explorar tab. Kept as a redirect so
 * old links (`finisherlegacy://feed`, notifications) still land somewhere.
 */
export default function FeedRedirect() {
  return <Redirect href="/explore" />;
}
