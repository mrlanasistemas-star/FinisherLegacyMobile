import {
  accumulate,
  bestEffortSeconds,
  capStoredPoints,
  crossedMilestone,
  decodePolyline,
  elevationGain,
  encodePolyline,
  formatPace,
  paceSecondsPerKm,
  recentPaceSecondsPerKm,
  simplifyRoute,
  type WorkoutPoint,
} from './workout-math';

/** ~111.2 m per 0.001° of latitude. A straight north run at `secondsPerStep` per 0.001°. */
function line(steps: number, secondsPerStep: number, start = 0, alt: (i: number) => number | null = () => null): WorkoutPoint[] {
  return Array.from({ length: steps + 1 }, (_, i) => ({ lat: 19 + i * 0.001, lng: -99, t: start + i * secondsPerStep * 1000, alt: alt(i) }));
}

describe('accumulate', () => {
  it('adds plausible distance and moving time', () => {
    const points = line(10, 30); // 111 m every 30 s ≈ 3.7 m/s
    const result = accumulate(null, points);
    expect(result.distanceM).toBeGreaterThan(1100);
    expect(result.distanceM).toBeLessThan(1125);
    expect(result.movingMs).toBe(300_000);
  });

  it('ignores GPS jumps faster than the activity allows', () => {
    const points: WorkoutPoint[] = [
      { lat: 19, lng: -99, t: 0, alt: null },
      { lat: 19.1, lng: -99, t: 5000, alt: null }, // 11 km in 5 s
    ];
    expect(accumulate(null, points).distanceM).toBe(0);
  });

  it('does not count standing still as moving', () => {
    const points: WorkoutPoint[] = [
      { lat: 19, lng: -99, t: 0, alt: null },
      { lat: 19, lng: -99, t: 30_000, alt: null },
    ];
    expect(accumulate(null, points).movingMs).toBe(0);
  });
});

describe('bestEffortSeconds', () => {
  it('is null when the route never reached the distance', () => {
    expect(bestEffortSeconds(line(20, 30), 5000)).toBeNull();
  });

  it('finds the fastest measured stretch, never faster than reality', () => {
    // 60 steps (~6.7 km): first 30 slow (40 s/step), then 30 fast (25 s/step).
    const slow = line(30, 40);
    const fast = line(30, 25, slow[slow.length - 1].t).slice(1).map((p, i) => ({ ...p, lat: 19 + (31 + i) * 0.001 }));
    const best = bestEffortSeconds([...slow, ...fast], 5000);
    expect(best).not.toBeNull();
    // 5 km needs ≥ 45 steps → at least 15 slow ones: 30·25 + 15·40 = 1350 s.
    expect(best as number).toBeGreaterThanOrEqual(1350);
    expect(best as number).toBeLessThan(45 * 40);
  });
});

describe('elevationGain', () => {
  it('sums climbs above the noise threshold', () => {
    const points = line(20, 30, 0, (i) => (i <= 10 ? 2000 + i * 5 : 2050 - (i - 10) * 5));
    expect(elevationGain(points)).toBe(50);
  });

  it('is null without altitude data', () => {
    expect(elevationGain(line(20, 30))).toBeNull();
  });
});

describe('polyline', () => {
  it('round-trips the route at 5 decimals', () => {
    const points = [
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ];
    const encoded = encodePolyline(points);
    expect(encoded).toBe('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(decodePolyline(encoded)).toEqual(points);
  });

  it('simplifies long routes under the cap and keeps both ends', () => {
    const points = line(5000, 5);
    const simple = simplifyRoute(points, 500);
    expect(simple.length).toBeLessThanOrEqual(500);
    expect(simple[0]).toBe(points[0]);
    expect(simple[simple.length - 1]).toBe(points[points.length - 1]);
  });

  it('caps stored points by thinning the older half', () => {
    const capped = capStoredPoints(line(999, 5), 600);
    expect(capped.length).toBe(750);
    expect(capped[capped.length - 1].t).toBe(999 * 5000);
  });
});

describe('pace', () => {
  it('needs real data before showing a number', () => {
    expect(paceSecondsPerKm(150, 600)).toBeNull();
    expect(paceSecondsPerKm(5000, 30)).toBeNull();
    expect(paceSecondsPerKm(5000, 1500)).toBe(300);
    expect(formatPace(321)).toBe('5:21');
    expect(formatPace(null)).toBeNull();
  });

  it('computes the recent pace only after the window', () => {
    expect(recentPaceSecondsPerKm(line(2, 30))).toBeNull();
    const pace = recentPaceSecondsPerKm(line(10, 30));
    expect(pace).toBeGreaterThan(260);
    expect(pace).toBeLessThan(280);
  });
});

describe('crossedMilestone', () => {
  it('fires once per km with GPS and every 10 minutes without', () => {
    expect(crossedMilestone({ distanceM: 950, elapsedMs: 0 }, { distanceM: 1010, elapsedMs: 0 }, { usesGps: true })).toEqual({ kind: 'km', value: 1 });
    expect(crossedMilestone({ distanceM: 1010, elapsedMs: 0 }, { distanceM: 1500, elapsedMs: 0 }, { usesGps: true })).toBeNull();
    expect(crossedMilestone({ distanceM: 4000, elapsedMs: 0 }, { distanceM: 5100, elapsedMs: 0 }, { usesGps: true, sportSlug: 'ciclismo' })).toEqual({ kind: 'km', value: 5 });
    expect(crossedMilestone({ distanceM: 0, elapsedMs: 599_000 }, { distanceM: 0, elapsedMs: 601_000 }, { usesGps: false })).toEqual({ kind: 'minutes', value: 10 });
  });
});
