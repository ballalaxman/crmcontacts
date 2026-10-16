import { useMemo, useState } from 'react';

interface SelectionState { view: string; ids: Set<string> }

export interface BulkSelection {
  ids: string[];
  count: number;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  /** Select every visible row, or clear if they are all selected already. */
  toggleAll: () => void;
  clear: () => void;
  allSelected: boolean;
  someSelected: boolean;
}

/**
 * Row selection for bulk actions. Selection belongs to the rows on screen: it is dropped when the view
 * (filters, sort or page) changes, and ids that are no longer visible never count as selected.
 */
export function useBulkSelection(visibleIds: readonly string[], viewKey: string): BulkSelection {
  const [state, setState] = useState<SelectionState>({ view: viewKey, ids: new Set() });
  const raw = state.view === viewKey ? state.ids : null;

  const selected = useMemo(() => {
    if (!raw) return new Set<string>();
    const visible = new Set(visibleIds);
    return new Set([...raw].filter((id) => visible.has(id)));
  }, [raw, visibleIds]);

  const update = (next: Set<string>) => setState({ view: viewKey, ids: next });
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  return {
    ids: [...selected],
    count: selected.size,
    isSelected: (id) => selected.has(id),
    toggle: (id) => {
      const next = new Set(selected);
      if (!next.delete(id)) next.add(id);
      update(next);
    },
    toggleAll: () => update(allSelected ? new Set() : new Set(visibleIds)),
    clear: () => update(new Set()),
    allSelected,
    someSelected: selected.size > 0 && !allSelected,
  };
}
