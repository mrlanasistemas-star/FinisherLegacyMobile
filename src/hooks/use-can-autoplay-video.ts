import * as Network from 'expo-network';
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Gates hero video autoplay behind Wi-Fi + reduced-motion off. There is no
 * mobile-optimized cut of the hero video available in this environment (no
 * ffmpeg to transcode the ~17MB desktop source — see docs/VISUAL_OVERHAUL.md),
 * so playing it over cellular would burn a meaningful chunk of a user's data
 * plan for a purely decorative moment (AGENTS.md §6/§63/§93).
 */
export function useCanAutoplayVideo(): boolean {
  const [canPlay, setCanPlay] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const [reduceMotion, network] = await Promise.all([
        AccessibilityInfo.isReduceMotionEnabled().catch(() => false),
        Network.getNetworkStateAsync().catch(() => null),
      ]);
      if (cancelled) return;
      const isWifi = network?.type === Network.NetworkStateType.WIFI;
      setCanPlay(isWifi && !reduceMotion);
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return canPlay;
}
