/**
 * Anticipated shapes for a future Community feature — NOT backed by any
 * real endpoint today (`COMMUNITY_ENABLED` in `./flags.ts` is `false`).
 * These exist only so UI/data-contract work can start once the backend in
 * docs/MOBILE_BACKEND_REQUIREMENTS.md lands, without guessing field names
 * twice. Do not build a hook or screen against these until a real endpoint
 * exists — that would mean either faking a network response or shipping
 * dead code.
 */

export interface AthleteFollowState {
  following: boolean;
  followers_count: number;
  following_count: number;
}
