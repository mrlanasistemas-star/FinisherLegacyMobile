import {
  applyReactionState,
  bumpComments,
  formatDuration,
  momentMetricLine,
  parseDuration,
  toggleFollowState,
  toggleReaction,
} from './moment-state';

import type { LegacyMoment } from '@/types/social';

const baseMoment: LegacyMoment = {
  uuid: 'm1',
  type: 'training',
  caption: 'Fondo',
  visibility: 'public',
  created_at: '2026-09-20T10:00:00Z',
  is_owner: false,
  author: { username: 'ana', name: 'Ana', photo_url: null, city: null },
  activity: null,
  medal: null,
  gear: null,
  metrics: { title: null, distance_km: 10, duration_seconds: 3134, pace: '5:13 /km', is_personal_record: false },
  media: [],
  reactions: { like: 2, cheer: 0 },
  my_reactions: [],
  comments_count: 1,
};

describe('toggleReaction', () => {
  it('adds and counts a reaction once', () => {
    const liked = toggleReaction(baseMoment, 'like', true);
    expect(liked.reactions.like).toBe(3);
    expect(liked.my_reactions).toEqual(['like']);
    expect(toggleReaction(liked, 'like', true)).toBe(liked); // idempotent
  });

  it('removes a reaction and never goes negative', () => {
    const unliked = toggleReaction({ ...baseMoment, my_reactions: ['cheer'], reactions: { like: 0, cheer: 0 } }, 'cheer', false);
    expect(unliked.reactions.cheer).toBe(0);
    expect(unliked.my_reactions).toEqual([]);
  });

  it('lets the server state win', () => {
    const synced = applyReactionState(baseMoment, { reactions: { like: 9, cheer: 1 }, my_reactions: ['cheer'] });
    expect(synced.reactions).toEqual({ like: 9, cheer: 1 });
    expect(synced.my_reactions).toEqual(['cheer']);
  });
});

describe('follow toggle', () => {
  it('updates the follower count optimistically and is idempotent', () => {
    const state = { is_following: false, followers_count: 4, following_count: 1 };
    const followed = toggleFollowState(state, true);
    expect(followed).toEqual({ is_following: true, followers_count: 5, following_count: 1 });
    expect(toggleFollowState(followed, true)).toBe(followed);
    expect(toggleFollowState(followed, false).followers_count).toBe(4);
  });
});

describe('metrics formatting', () => {
  it('formats durations like a race clock', () => {
    expect(formatDuration(3134)).toBe('52:14');
    expect(formatDuration(5405)).toBe('1:30:05');
    expect(formatDuration(0)).toBeNull();
  });

  it('parses what athletes type', () => {
    expect(parseDuration('52:14')).toBe(3134);
    expect(parseDuration('1:30:05')).toBe(5405);
    expect(parseDuration('52:75')).toBeNull();
    expect(parseDuration('abc')).toBeNull();
  });

  it('builds the card metric line from training metrics or race results', () => {
    expect(momentMetricLine(baseMoment)).toEqual(['10 km', '52:14', '5:13 /km']);
    expect(
      momentMetricLine({
        ...baseMoment,
        activity: {
          participant_id: null, event: 'Medio Maratón', event_slug: null, edition: null, event_date: null,
          race: '21K', distance: '21.1 km', official_time: '1:45:10', pace: '4:59', overall_position: 120,
        },
      }),
    ).toEqual(['21.1 km', '1:45:10', '4:59']);
  });

  it('keeps comment counts non-negative', () => {
    expect(bumpComments(baseMoment, -5).comments_count).toBe(0);
  });
});
