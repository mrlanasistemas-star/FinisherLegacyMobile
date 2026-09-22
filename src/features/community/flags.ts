/**
 * The backend has no follow/feed/moment/like/comment tables, models, or
 * routes today (verified reading `routes/api.php` — confirmed absent, not
 * just unaudited). This flag exists so a future pass can wire the real
 * screens without first re-deciding "should this be visible" — until the
 * backend exists, this must stay `false`. Never show an empty/fake social
 * feed in production. See docs/MOBILE_BACKEND_REQUIREMENTS.md → "COMUNIDAD
 * / LEGACY MOMENTS" for the exact backend contract this is waiting on.
 */
export const COMMUNITY_ENABLED = false;
