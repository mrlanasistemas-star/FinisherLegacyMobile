import { accumulateDistance, classifyUploadFailure, appendPoints, backoffDelay, BUFFER_CAP, distanceBetween, MAX_BATCH, nextBatch, removeSent, toTrackingPoint, type TrackingPoint } from './points';

function point(second: number, lat = 19.4326, lng = -99.1332): TrackingPoint {
  return { lat, lng, accuracy: 5, recorded_at: new Date(Date.UTC(2026, 9, 18, 7, 0, second)).toISOString() };
}

describe('toTrackingPoint', () => {
  const location = (overrides: Partial<{ latitude: number; longitude: number; accuracy: number | null; speed: number | null }> = {}) => ({
    coords: { latitude: 19.43261234, longitude: -99.13321234, accuracy: 6.27, altitude: 2240.55, speed: 3.456, ...overrides },
    timestamp: Date.UTC(2026, 9, 18, 7, 0, 0),
  });

  it('maps a location to the ingest contract', () => {
    expect(toTrackingPoint(location(), 0.82)).toEqual({
      lat: 19.432612,
      lng: -99.133212,
      accuracy: 6.3,
      altitude: 2240.6,
      speed: 3.46,
      recorded_at: '2026-10-18T07:00:00.000Z',
      battery: 82,
    });
  });

  it('drops inaccurate or invalid fixes and negative speeds', () => {
    expect(toTrackingPoint(location({ accuracy: 300 }))).toBeNull();
    expect(toTrackingPoint(location({ latitude: 120 }))).toBeNull();
    expect(toTrackingPoint(location({ speed: -1 }))?.speed).toBeNull();
    expect(toTrackingPoint(location())).not.toHaveProperty('battery');
  });
});

describe('buffer', () => {
  it('appends in order without duplicates', () => {
    const buffer = appendPoints([point(2)], [point(1), point(2), point(3)]);
    expect(buffer.map((p) => p.recorded_at.slice(17, 19))).toEqual(['01', '02', '03']);
  });

  it('keeps only the newest points beyond the cap', () => {
    const many = Array.from({ length: 12 }, (_, i) => point(i));
    const capped = appendPoints([], many, 10);
    expect(capped).toHaveLength(10);
    expect(capped[0]).toEqual(point(2));
    expect(BUFFER_CAP).toBeGreaterThan(1000);
  });

  it('batches at most 100 points, oldest first', () => {
    const many = Array.from({ length: 250 }, (_, i) => point(i % 60, 19 + i / 1000));
    expect(nextBatch(many)).toHaveLength(MAX_BATCH);
    expect(nextBatch(many, 500)).toHaveLength(MAX_BATCH);
    expect(nextBatch(many, 20)).toHaveLength(20);
    expect(nextBatch([], 20)).toHaveLength(0);
  });

  it('removes exactly the sent points', () => {
    const buffer = [point(1), point(2), point(3)];
    expect(removeSent(buffer, [point(1), point(2)])).toEqual([point(3)]);
  });
});

describe('distance', () => {
  it('measures roughly 111 m per 0.001° of latitude', () => {
    expect(distanceBetween({ lat: 19, lng: -99 }, { lat: 19.001, lng: -99 })).toBeGreaterThan(110);
    expect(distanceBetween({ lat: 19, lng: -99 }, { lat: 19.001, lng: -99 })).toBeLessThan(112);
  });

  it('accumulates running distance and ignores impossible jumps', () => {
    const run = [point(0, 19.0), point(30, 19.001), point(31, 19.05)];
    const { distance, last } = accumulateDistance(null, run);
    expect(distance).toBeGreaterThan(100);
    expect(distance).toBeLessThan(120);
    expect(last).toEqual(run[2]);
  });
});

describe('backoff', () => {
  it('grows exponentially and caps at two minutes', () => {
    expect(backoffDelay(0, () => 0.5)).toBe(2000);
    expect(backoffDelay(3, () => 0.5)).toBe(16000);
    expect(backoffDelay(20, () => 0.5)).toBe(120000);
    expect(backoffDelay(0, () => 0)).toBe(1500);
  });
});

describe('upload failure policy', () => {
  it('keeps points on transient failures and drops only bad batches', () => {
    expect(classifyUploadFailure('network')).toBe('retry');
    expect(classifyUploadFailure('timeout')).toBe('retry');
    expect(classifyUploadFailure('server', 503)).toBe('retry');
    expect(classifyUploadFailure('rate_limited', 429)).toBe('retry');
    expect(classifyUploadFailure('validation', 422)).toBe('drop_batch');
    expect(classifyUploadFailure('conflict', 409)).toBe('session_closed');
    expect(classifyUploadFailure('not_found', 404)).toBe('session_closed');
    expect(classifyUploadFailure('unauthenticated', 401)).toBe('needs_login');
  });
});
