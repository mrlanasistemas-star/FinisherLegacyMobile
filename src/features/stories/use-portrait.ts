/**
 * TanStack Query glue of the Portarretrato designer: the builder data of a
 * story (photos, templates, defaults, product, saved designs), save /
 * update / delete of a design, and a debounced live preview rendered by
 * the server (same composer as the print — what you see is what prints).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { AppError } from '@/api/errors';
import { createPortraitDesign, deletePortraitDesign, getPortraitBuilder, renderPortraitPreview, updatePortraitDesign } from '@/api/portrait';
import type { PortraitBuilder, PortraitDesign, PortraitDraft } from '@/schemas/portrait';
import { ensureOnline } from '@/utils/network';

export const portraitKeys = {
  builder: (publicId: string) => ['stories', 'portrait', publicId] as const,
};

export function usePortraitBuilder(publicId: string) {
  return useQuery({ queryKey: portraitKeys.builder(publicId), queryFn: () => getPortraitBuilder(publicId), enabled: publicId !== '' });
}

/** Keeps the cached design list in step with a save without refetching the whole builder. */
function upsert(builder: PortraitBuilder | undefined, design: PortraitDesign): PortraitBuilder | undefined {
  if (!builder) return builder;
  const others = builder.designs.filter((item) => item.uuid !== design.uuid);
  return { ...builder, designs: [design, ...others] };
}

export function useSavePortraitDesign(publicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ uuid, draft }: { uuid: string | null; draft: PortraitDraft }) => {
      await ensureOnline();
      return uuid ? updatePortraitDesign(uuid, draft) : createPortraitDesign(publicId, draft);
    },
    onSuccess: (design) => {
      queryClient.setQueryData<PortraitBuilder>(portraitKeys.builder(publicId), (current) => upsert(current, design));
    },
  });
}

export function useDeletePortraitDesign(publicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (uuid: string) => {
      await ensureOnline();
      await deletePortraitDesign(uuid);
      return uuid;
    },
    onSuccess: (uuid) => {
      queryClient.setQueryData<PortraitBuilder>(portraitKeys.builder(publicId), (current) =>
        current ? { ...current, designs: current.designs.filter((item) => item.uuid !== uuid) } : current,
      );
    },
  });
}

const PREVIEW_DEBOUNCE_MS = 600;

/**
 * Asks the server for a preview ~600 ms after the draft stops changing.
 * The last image stays on screen while the next one renders, and a
 * request that was overtaken is aborted so an old preview never wins.
 */
export function usePortraitPreview(publicId: string, draft: PortraitDraft | null, width: number) {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const signature = draft ? JSON.stringify(draft) : null;

  useEffect(() => {
    if (!signature) return;
    const current: PortraitDraft = JSON.parse(signature) as PortraitDraft;
    const timer = setTimeout(() => {
      controller.current?.abort();
      const next = new AbortController();
      controller.current = next;
      setLoading(true);
      renderPortraitPreview(publicId, current, width, next.signal)
        .then((uri) => {
          if (next.signal.aborted) return;
          setImage(uri);
          setError(null);
        })
        .catch((caught: unknown) => {
          if (next.signal.aborted) return;
          setError(caught instanceof AppError ? caught.message : null);
        })
        .finally(() => {
          if (!next.signal.aborted) setLoading(false);
        });
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [publicId, signature, width]);

  // Leaving the screen cancels whatever is still rendering.
  useEffect(() => () => controller.current?.abort(), []);

  return { image, loading, error };
}
