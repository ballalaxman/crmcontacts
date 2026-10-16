import type { BulkTagResult } from '../../../contracts/api-types';
import { useToast } from '../../../components/ui';
import { describeError } from '../../../lib/error-messages';
import { useBulkTag } from '../hooks/mutations';
import type { BulkSelection } from './useBulkSelection';

export const bulkResultMessage = (r: BulkTagResult) =>
  `Tagged ${r.updated} · ${r.alreadyTagged} already tagged · ${r.notFound} not found`;

/**
 * Applies a tag to the selected rows and reports the outcome:
 * success (all handled), warning (some ids no longer exist), or error (nothing happened; the
 * selection is kept so the user can retry).
 */
export function useBulkTagAction(selection: BulkSelection) {
  const bulk = useBulkTag();
  const toast = useToast();

  const apply = (tag: string) => {
    const count = selection.count;
    bulk.mutate(
      { ids: selection.ids, tag },
      {
        onSuccess: (result) => {
          if (result.notFound > 0) {
            toast.push(`${bulkResultMessage(result)}. Missing contacts may have been removed.`, 'warning');
          } else {
            toast.push(bulkResultMessage(result), 'success');
          }
          selection.clear();
        },
        onError: (e) => toast.push(`Couldn't tag ${count} contact${count === 1 ? '' : 's'}: ${describeError(e)}`, 'error'),
      },
    );
  };

  return { apply, pending: bulk.isPending };
}
