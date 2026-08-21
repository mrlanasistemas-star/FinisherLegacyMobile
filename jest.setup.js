// Metro/EAS inline EXPO_PUBLIC_* from .env at bundle time; Jest doesn't run
// that step, so `src/utils/env.ts` would throw before any test module
// loads. Fill in the same real API URL from .env.example — not a mock
// value, the actual production default — purely so imports resolve.
process.env.EXPO_PUBLIC_API_URL ??= 'https://finisherlegacy.com/api/v1';
