/**
 * Former cheers-only "Modo entrenamiento" screen. The cheer session now
 * rides along a real, persisted live workout (`training/workout.tsx`), so
 * this route only forwards there — old links and deep links keep working.
 */
import { Redirect, type Href } from 'expo-router';

export default function TrainingSessionRedirect() {
  return <Redirect href={'/training/workout' as Href} />;
}
