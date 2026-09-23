import type { ReactNode } from 'react';

import { TopBar } from '@/components/ui/top-bar';

/** Back button + title for pushed screens — a thin alias over TopBar. */
export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  return <TopBar title={title} right={right} />;
}
