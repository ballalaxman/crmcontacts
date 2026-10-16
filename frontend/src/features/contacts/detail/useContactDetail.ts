import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../../api/http-client';
import { useToast } from '../../../components/ui';
import type { ContactDto, EditableField, UpdateContactInput } from '../../../contracts/api-types';
import { describeError } from '../../../lib/error-messages';
import { contactKeys } from '../api/query-keys';
import { isVersionConflict, useTagMutations, useUpdateContact } from '../hooks/mutations';
import { useActivities, useContact, useTags } from '../hooks/queries';
import { isInlineError, toFieldErrors } from './field-errors';

export interface Conflict {
  /** The fields the user tried to save. */
  mine: Partial<Record<EditableField, string | null>>;
  /** The contact as it is on the server now. */
  latest: ContactDto;
  /** What the user was looking at when they saved. */
  base?: ContactDto;
}

/** An unknown id (404) and a malformed id (400 from the id check) both mean "no such contact". */
const isMissingContact = (e: unknown) =>
  e instanceof ApiError && (e.status === 404 || e.code === 'VALIDATION_ERROR');

/**
 * Everything the contact page does: load, save with optimistic locking, resolve conflicts, add and
 * remove tags. The page only lays out what this returns.
 */
export function useContactDetail(id: string) {
  const qc = useQueryClient();
  const toast = useToast();
  const contactQuery = useContact(id);
  const activities = useActivities(id);
  const allTags = useTags();
  const update = useUpdateContact(id);
  const tagMutations = useTagMutations(id);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  // Set synchronously, so two clicks in the same frame can't both start a save.
  const saveInFlight = useRef(false);

  const serverErrors = useMemo(() => toFieldErrors(update.error), [update.error]);

  const save = (input: UpdateContactInput) => {
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    const { version, ...mine } = input;
    void version;
    const base = contactQuery.data;
    update.mutate(input, {
      onSuccess: () => toast.push('Changes saved', 'success'),
      onError: (e) => {
        if (isVersionConflict(e)) setConflict({ mine, latest: e.details.current, base });
      },
      onSettled: () => {
        saveInFlight.current = false;
      },
    });
  };

  const resolveConflict = {
    applyMine: () => {
      if (!conflict) return;
      const { mine, latest } = conflict;
      setConflict(null);
      save({ version: latest.version, ...mine });
    },
    discardMine: () => {
      if (!conflict) return;
      qc.setQueryData(contactKeys.detail(id), conflict.latest); // the form reloads because the version changed
      update.reset();
      setConflict(null);
    },
    keepEditing: () => setConflict(null),
  };

  const addTag = (tag: string) =>
    tagMutations.add.mutate(tag, {
      onSuccess: () => toast.push(`Added tag “${tag}”`, 'success'),
      onError: (e) => toast.push(`Couldn't add “${tag}”: ${describeError(e)}`, 'error'),
    });

  const removeTag = (tag: string) =>
    tagMutations.remove.mutate(tag, {
      onSuccess: () => toast.push(`Removed tag “${tag}”`, 'success'),
      onError: (e) => toast.push(`Couldn't remove “${tag}”: ${describeError(e)}`, 'error'),
    });

  return {
    contact: contactQuery.data,
    isLoading: contactQuery.isLoading,
    notFound: isMissingContact(contactQuery.error),
    loadError: contactQuery.data ? null : contactQuery.error,
    retryLoad: () => void contactQuery.refetch(),
    reloading: contactQuery.isFetching,

    save,
    saving: update.isPending,
    serverErrors,
    /** A failed save that isn't shown on a field or in the conflict dialog (network, 500, rate limit). */
    saveError: update.isError && !isInlineError(update.error) ? update.error : null,
    retrySave: () => {
      if (update.variables) save(update.variables);
    },

    conflict,
    resolveConflict,

    activities: {
      items: activities.data,
      isLoading: activities.isLoading,
      isError: activities.isError,
      retry: () => void activities.refetch(),
    },
    tags: {
      suggestions: allTags.data ?? [],
      add: addTag,
      remove: removeTag,
      adding: tagMutations.add.isPending,
      removing: tagMutations.remove.isPending ? (tagMutations.remove.variables ?? null) : null,
    },
  };
}
