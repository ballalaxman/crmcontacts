# Frontend audit

Audited before any change, on 2026-10-16, against the running app: API on :4000 with 5,000 seeded contacts, Vite on :5173, Chrome at 360 / 768 / 1280 px, console open. Sizes come from `getBoundingClientRect`, contrast from the WCAG formula.

Baseline: typecheck, lint and 47 tests green; production build OK; no page-level horizontal scroll at any width.

Severity: **high** = breaks a stated requirement or blocks keyboard/touch users. **med** = visible quality or robustness problem. **low** = polish.

## 1. UI/UX quality

| # | File(s) | Finding | Sev | Planned fix |
|---|---|---|---|---|
| U1 | `index.css` | Colours are variables, but spacing, type sizes, radii and z-index are hard-coded px/rem (`padding: 10px 12px`, `7px 14px`, `0.85rem`, `z-index: 20/100/150/200` …). No scale, so screens drift. | med | Token layer: colour, `--space-*`, `--text-*`, `--radius-*`, `--shadow-*`, `--z-*`, motion. Replace every literal. |
| U2 | `FiltersBar.tsx`, `index.css` | Toolbar baseline is uneven: "Tags" is a bare button while every other control has a label above it. Sort lives only in table headers, so there is no sort control on small screens. | med | One toolbar: search, sort select, "Filters" with an active-count badge; filter fields in a panel, all labelled. |
| U3 | `ContactsTable.tsx` | At 1280 px dates wrap ("30 Sept / 2026"), companies and tags wrap, so row heights are ragged. Long emails or names stretch rows; no truncation, no tooltip. | med | Fixed column sizing, `nowrap` dates, ellipsis plus `title` on email/company/name, tag overflow as "+N". |
| U4 | `TagChips.tsx` | "No tags" repeats in muted text on every untagged row: noise. | low | Show "—" in the table; "No tags yet" only on the detail page. |
| U5 | `ActivityTimeline.tsx` | Entry types look identical; no icon or badge. Long field values wrap without truncation. | med | Type badge and icon per entry, truncated values with `title`, exact time on hover (already) on a `RelativeTime` primitive. |
| U6 | `ContactsListPage.tsx`, `ContactDetailPage.tsx` | No page-header pattern: the list heading has no count; the detail heading mixes name, version and time on one line. | low | `PageHeader` (title, meta, actions) on both screens; version as a badge. |
| U7 | `Skeleton.tsx` | Detail skeleton covers the form only, not the tags and activity cards. | low | Skeleton for the whole detail layout. |
| U8 | `index.css` | Buttons have hover only: no active state, few transitions. Remove-tag "×" has no hover background. | low | Full state set (hover / active / focus-visible / disabled) on the Button primitive; 120–180 ms transitions honouring `prefers-reduced-motion`. |
| U9 | `EmptyState.tsx` | Plain text; no icon, and the action isn't visually primary. | low | Icon, title, description, primary action. |
| U10 | `Skeleton.tsx` | Inline styles: `style={{ width, height }}`, `style={{ marginTop: 16 }}`. | low | Width via CSS custom property; spacing via utility classes. |

## 2. Frontend fundamentals (structure and state)

| # | File(s) | Finding | Sev | Planned fix |
|---|---|---|---|---|
| F1 | `components/common`, `components/contacts`, `components/contact`, `hooks/` | No generic primitive layer. `className="btn …"` is repeated on about 20 raw `<button>`s; inputs, labels and errors are hand-wired in every form. | med | `components/ui/` (Button, IconButton, Input/Field, Select, Checkbox, Dialog, Badge, Chip, Skeleton, Spinner, EmptyState, ErrorState, Toast, RelativeTime, Truncate). |
| F2 | `pages/ContactDetailPage.tsx` (153 lines) | Fetching, mutation, conflict state machine, error mapping and layout in one component. | high | `features/contacts/detail/useContactDetail` hook; the page only composes sections. |
| F3 | `pages/ContactsListPage.tsx` (125 lines) | Selection, total-count memory, sort toggling, bulk handling and layout in the page. | med | `useContactList` (params, pager, query, total), `useBulkSelection`, `useBulkTagAction`; presentational sections. |
| F4 | `lib/server-errors.ts` | Imports a type from a component (`FieldError` from `ContactForm`): dependency points the wrong way. | low | Move field-error types into the feature's `types.ts`. |
| F5 | `api/contacts-api.ts`, `api/query-keys.ts` | Contact-specific API and keys sit in a generic `api/` folder. | low | `features/contacts/api/`; `api/` keeps only the transport and the provider. |
| F6 | `main.tsx` | QueryClient policy and router flags are inline and duplicated in `test/render.tsx`. | low | `app/query-client.ts`, `app/router.tsx`, shared by the app and the tests. |

## 3. Component design and code quality

| # | File(s) | Finding | Sev | Planned fix |
|---|---|---|---|---|
| C1 | `ConflictDialog.tsx`, `ActivityTimeline.tsx` | The same `show()` dash formatter is defined twice. | low | `formatValue` in `lib/format.ts`. |
| C2 | `TagInput.tsx`, `BulkActionBar.tsx` | Tag parsing/validation duplicated. | low | `useTagDraft` hook used by both. |
| C3 | both pages | `document.title` effects duplicated, with literal strings. | low | `useDocumentTitle`. |
| C4 | `ConflictDialog.tsx`, `FiltersBar.tsx`, `server-errors.ts`, `format.ts`, `ContactDetailPage.tsx` | Unchecked casts: `as EditableField[]`, `as TagMode[]`, `field as EditableField`, `location.state as {from?}`. No `any`. | low | Typed constants (`EDITABLE_FIELDS`, `TAG_MODES`), type guards (`isEditableField`, `readBackState`). |
| C5 | several | Magic strings and numbers: `maxLength={100}`, `30`, `50`, toast durations, debounce 300, slow flag 3000. | low | One `constants.ts` per concern (limits mirror the contract). |

## 4. Functionality and interactions

| # | File(s) | Finding | Sev | Planned fix |
|---|---|---|---|---|
| I1 | detail page | No warning when leaving with unsaved edits (in-app navigation or closing the tab). `useBlocker` needs a data router, but the app uses `<BrowserRouter>`. | high | Move to `createBrowserRouter`; `useUnsavedChangesGuard` = `useBlocker` + `beforeunload` + confirm dialog. |
| I2 | `ConflictDialog.tsx` | Escape does nothing, focus isn't trapped and isn't restored on close; no way to just close and keep editing. | high | `Dialog` primitive: focus trap, Escape, restore focus, scroll lock, portal. Add "Keep editing". |
| I3 | `FiltersBar.tsx` | The `<details>` tag dropdown never closes on Escape or outside click. | med | Filters panel with an explicit toggle (`aria-expanded`), Escape and outside-click close. |
| I4 | `contacts-api.ts`, hooks | The query `signal` is ignored, so rapid filter changes leave stale requests running. | med | Pass `AbortSignal` from TanStack Query through `ContactsApi` to `fetch`. |
| I5 | `ContactsListPage.tsx` | An `INVALID_CURSOR` (expired or tampered page) shows a banner; it should go back to page 1. | med | Detect the code, reset the cursor stack, show an info toast. |
| I6 | `ContactsListPage.tsx` | A failed page change replaces the table with a banner (rows vanish). | med | Keep the last good rows, dimmed, with an inline error and Retry above them. |
| I7 | `ContactsListPage.tsx` | Bulk result is always a success toast, even when some ids were not found or the request failed. | med | Success / warning / error tone from the counts; error keeps the selection for a retry. |
| I8 | `ContactForm.tsx`, `TagInput.tsx`, `BulkActionBar.tsx` | Pending state changes the label only: no spinner. The submit handler has no re-entrancy guard. | low | `Button loading` (spinner + `aria-busy`); ignore submits while pending. |
| I9 | `http-client.ts` | No timeout: a hung server spins forever. | med | Configurable timeout (`VITE_API_TIMEOUT_MS`, default 30 s) → `ApiError('TIMEOUT')`. |
| I10 | `main.tsx` | Retry only for network errors; 5xx never retried; mutations rely on library defaults. | low | `shouldRetry`: never 4xx, up to 2 for network/timeout/5xx; mutations never auto-retry. Unit-tested. |
| I11 | detail page | Tag add/remove gives no success feedback (errors only). | low | Short success toast; inline pending state on the chip. |
| I12 | app shell | No offline indicator. | low | `useOnlineStatus` + banner. |

## 5. Responsive design

| # | File(s) | Finding | Sev | Planned fix |
|---|---|---|---|---|
| R1 | `index.css` | 48 touch targets under 40 px at 360 px: checkboxes 13×13, inputs 36 px, sort buttons 19 px, name links 20 px, tag "×" 15×16. | high | 40 px minimum (44 px on coarse pointers) for buttons, inputs and checkbox hit areas. |
| R2 | `ContactsTable.tsx` | At ≤768 px the 7-column table scrolls sideways inside its card. Usable, but not designed for phones. | med | Card list under 768 px via `useMediaQuery`; the table from 768 px up. |
| R3 | `FiltersBar.tsx` | At 360 px the filters take three rows before any data. | med | Filters collapse behind a "Filters" toggle under 768 px. |
| R4 | `index.css` | Fixed widths: actor input 140 px, dropdown 220 px, toasts 420 px. | low | `clamp()` / `min()`; fluid grid for the toolbar. |
| R5 | detail page | Single column until 860 px, side by side above: correct, but the breakpoint is a one-off number. | low | Shared breakpoints (768, 1024) used everywhere. |

## 6. Backend integration

| # | File(s) | Finding | Sev | Planned fix |
|---|---|---|---|---|
| B1 | `http-client.ts`, `server-errors.ts` | `ApiError.code` is a `string`, and field errors are dug out of `details` with casts in UI code. | med | `ApiError` with typed `code: ErrorCode` and parsed `fieldErrors`. |
| B2 | `contracts/api-types.ts` | Checked against `backend/src/contracts`: DTOs, enums and regexes match. Gaps: `LIMITS` lacks `searchMax`/`activitiesMax`/tag length used by inputs; no `TIMEOUT` client code. | low | Complete the mirror; inputs use the limits. |
| B3 | all endpoints | Paths, methods and bodies match §7 of the plan for all 8 endpoints the UI calls. **No mismatch found; no backend change needed.** | — | Keep the contract tests in `units.test.ts`; add one per endpoint. |

## 7. Testing and edge cases

| # | Area | Finding | Sev | Planned fix |
|---|---|---|---|---|
| T1 | tests | 47 tests. Not covered: unsaved-changes guard, Escape/focus trap, mobile cards, invalid-cursor reset, timeout, retry policy, `useContactListParams` directly, selection logic, axe. | med | Add tests for each. |
| T2 | a11y | No automated accessibility checks. | med | `vitest-axe` (dev only) on list, detail and dialog. |
| T3 | console | Normal flows: no app errors or warnings. Earlier sessions showed React Router v7 future-flag warnings (fixed in the last pass; re-checked after the router move). Chrome itself logs "Failed to load resource" for every non-2xx response (404, 409, 400). That is browser network logging, not app output, and it appears only in error flows. | low | Keep app output at zero; document the browser's own lines. |

### Accessibility (spans 1, 4, 5)

| # | Finding | Sev | Planned fix |
|---|---|---|---|
| A1 | Muted text on the table-header background is 4.44:1 (needs 4.5). All other pairs pass (light and dark, 4.64–15.4:1). | low | Darken `--color-text-muted` in light mode; re-measure every pair. |
| A2 | Each field error uses `role="alert"`, so screen readers interrupt on every keystroke while a field is invalid. | low | Errors via `aria-describedby` + `aria-invalid`; one polite live region for form-level status. |
| A3 | Dialog focus problems (see I2). | high | Dialog primitive. |
| A4 | Rows are clickable `<tr>`s for mouse users. Keyboard users have the name link, so this is fine, but it is undocumented. | low | Keep it; document it. |
| A5 | Pending state not announced. | low | `aria-busy` on buttons and results. |

## 8. Explainability

| # | Finding | Sev | Planned fix |
|---|---|---|---|
| E1 | No record of the frontend design decisions. | med | `frontend/DECISIONS.md`. |
| E2 | README describes the old structure. | low | Update; add a "Tested scenarios" checklist. |

---

## Criteria checklist (filled in after the fixes)

Every finding above was addressed, high first. Verified with typecheck, lint, 123 tests (47 before), a production build, and a manual pass in Chrome at 360 / 768 / 1280 px against the real API.

- [x] **1. UI/UX quality** (U1–U10)
  - Tokens: `src/styles/tokens.css`; primitives: `src/components/ui/*`, `src/components/ui/ui.css`
  - Hierarchy: `components/layout/PageHeader.tsx`, `features/contacts/list/ListToolbar.tsx`
  - Skeletons: `list/ListSkeleton.tsx`, `detail/DetailSkeleton.tsx`; empty states: `ui/EmptyState.tsx`, `list/ContactListResults.tsx`
  - Truncation with tooltip: `ui/Truncate.tsx`, `tags/RowTags.tsx`; timeline badges and times: `activity/ActivityTimeline.tsx`, `ui/RelativeTime.tsx`
- [x] **2. Frontend fundamentals** (F1–F6)
  - Boundaries: `components/ui`, `features/contacts/{api,hooks,list,detail,tags,activity}`, `pages/*` (composition only)
  - Logic in hooks: `list/useContactList.ts`, `list/useBulkSelection.ts`, `list/useBulkTagAction.ts`, `detail/useContactDetail.ts`
  - State: URL (`list/useContactListParams.ts`), Query (`hooks/queries.ts`, `hooks/mutations.ts`), context only in `app/AppProviders.tsx`
- [x] **3. Component design and code quality** (C1–C5)
  - Shared formatters: `lib/format.ts` (`formatValue`, `formatCount`…); constants: `lib/constants.ts`, `contracts/api-types.ts` (`LIMITS`, enums)
  - Casts replaced with guards: `isEditableField`, `lib/guards.ts`, `lib/navigation.ts`. No `any`; no inline styles. Three justified casts remain (the JSON boundary in `http-client.ts`, the `useImperativeHandle` ref in `Field.tsx`, and a narrowing after a membership check in `list-params.ts`).
  - Largest files after the split (measured): `ui/Field.tsx` 150 lines (four related field primitives), `pages/ContactDetailPage.tsx` 129 (layout only, down from 153 with all the logic), `api/http-client.ts` 112, `detail/useContactDetail.ts` 110. No component over ~110 lines does more than one job.
- [x] **4. Functionality and interactions** (I1–I12)
  - Unsaved changes: `detail/UnsavedChangesGuard.tsx` (data router in `app/routes.tsx`)
  - Dialog keyboard and focus: `ui/Dialog.tsx`, `ui/useFocusTrap.ts`; popover: `ui/Popover.tsx`
  - Cancellation and timeout: `api/http-client.ts`, `hooks/queries.ts`; invalid cursor and stale rows: `list/useContactList.ts`
  - Double submit: `ui/Button.tsx` (`loading`), `detail/useContactDetail.ts` (in-flight ref), `list/BulkActionBar.tsx`
  - Feedback: `ui/Toast.tsx`, `list/useBulkTagAction.ts` (success / warning / error); offline: `components/layout/Notices.tsx`
- [x] **5. Responsive design** (R1–R5)
  - Cards vs table: `list/ContactCardList.tsx`, `list/ContactsTable.tsx`, `hooks/useMediaQuery.ts`, `lib/breakpoints.ts`
  - Collapsed filters: `list/ListToolbar.tsx`; pinned columns, grids and touch targets: `features/contacts/contacts.css`, `styles/tokens.css` (`--control-height`)
- [x] **6. Backend integration** (B1–B3)
  - One typed error: `api/http-client.ts` (`ApiError` with `code`, `status`, `fieldErrors`); retry policy: `app/query-client.ts`
  - Contract mirror completed: `contracts/api-types.ts`, `contracts/validation.ts`. Endpoints re-checked against `backend/src/http/routes/index.ts`; **no backend change**.
- [x] **7. Testing and edge cases** (T1–T3, A1–A5)
  - New: `test/list-states.test.tsx` (15), `test/detail.test.tsx` (23), `test/hooks-and-api.test.tsx` (32), `test/a11y.test.tsx` (6, axe). Existing 47 kept, with only import paths updated.
  - Console: zero app errors and warnings in normal flows (see DECISIONS.md §8 for the browser's own network lines).
- [x] **8. Implementation decisions** (E1–E2)
  - `frontend/DECISIONS.md`, `frontend/README.md` (structure, "Tested scenarios")
