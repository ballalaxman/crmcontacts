import { ApiError } from '../../../api/http-client';
import { isEditableField, type EditableField } from '../../../contracts/api-types';
import { messageFor } from '../../../lib/error-messages';

export interface FieldError { field: EditableField; message: string }

/** Codes shown on the form itself or in the conflict dialog, so they don't also get a banner. */
export const INLINE_CODES: ReadonlySet<string> = new Set(['VALIDATION_ERROR', 'EMAIL_TAKEN', 'VERSION_CONFLICT']);

export const isInlineError = (error: unknown) => error instanceof ApiError && INLINE_CODES.has(error.code);

/** Turns a rejected save into per-field messages the form shows under the right input. */
export function toFieldErrors(error: unknown): FieldError[] | undefined {
  if (!(error instanceof ApiError)) return undefined;

  if (error.code === 'EMAIL_TAKEN') return [{ field: 'email', message: messageFor('EMAIL_TAKEN') }];

  if (error.code === 'VALIDATION_ERROR') {
    return Object.entries(error.fieldErrors)
      .filter((entry): entry is [EditableField, string[]] => isEditableField(entry[0]) && entry[1].length > 0)
      .map(([field, messages]) => ({ field, message: messages[0] }));
  }
  return undefined;
}
