/** Every TanStack Query key the contacts feature uses, so invalidation can't miss one by a typo. */
export const contactKeys = {
  lists: () => ['contacts'] as const,
  list: (params: unknown, cursor: string | null) => ['contacts', params, cursor] as const,
  detail: (id: string) => ['contact', id] as const,
  activities: (id: string) => ['activities', id] as const,
  tags: () => ['tags'] as const,
};
