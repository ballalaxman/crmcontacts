# CRM Contacts — Web app

React 18 · TypeScript · Vite · TanStack Query · React Hook Form + Zod · React Router (data router). A standalone project: it shares no code with `../backend`; the only link is the HTTP API.

See **[DECISIONS.md](DECISIONS.md)** for why it is built this way, and **[AUDIT.md](AUDIT.md)** for the audit this version came out of.

## Run it locally

Start the API first (see `../backend/README.md`: `npm run db:start`, `npm run seed:reset`, `npm run dev`). Then:

```bash
npm install
npm run dev           # http://localhost:5173
```

| Variable (`.env`) | Default | Meaning |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:4000/api` | Where the API is |
| `VITE_API_TIMEOUT_MS` | `30000` | Give up on a request after this long and show "taking too long" with Retry |

The API allows the `http://localhost:5173` origin by default (`CORS_ORIGINS` in the backend `.env`).

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` / `npm run preview` | Type-check and bundle to `dist/`, then serve it |
| `npm test` | 124 tests (Vitest + Testing Library + MSW + axe). No backend needed: MSW fakes the API |
| `npm run typecheck`, `npm run lint` | Static checks |

## Structure

```
src/
  app/          routes (data router), providers, QueryClient retry policy, app shell, route error page
  api/          http-client (every failure → typed ApiError, timeout, cancellation), ApiProvider (DI)
  contracts/    mirror of the backend contract (types, enums, limits, form rules)
  components/
    ui/         generic primitives: Button, IconButton, TextField, SelectField, Checkbox, SegmentedControl,
                Dialog, ConfirmDialog, Popover, Toast, Badge, Chip, Skeleton, Spinner, EmptyState,
                ErrorState, Notice, RelativeTime, Truncate, Icon
    layout/     PageHeader, ActorSwitcher, notices
  features/contacts/
    api/        ContactsApi interface + implementation, query keys
    hooks/      queries.ts, mutations.ts (server state)
    list/       useContactList, useContactListParams, useCursorPagination, useBulkSelection,
                useBulkTagAction + toolbar, table, card list, pagination, bulk bar
    detail/     useContactDetail, ContactForm, ConflictDialog, UnsavedChangesGuard, field-error mapping
    tags/       TagsCard, TagChips, TagInput, RowTags, useTagDraft
    activity/   ActivityTimeline
  hooks/        useMediaQuery, useDebouncedValue, useSlowFlag, useDocumentTitle, useOnlineStatus
  lib/          format, error messages, constants, breakpoints, guards, navigation state
  pages/        ContactsListPage, ContactDetailPage, NotFoundPage (composition only)
  styles/       tokens.css (design tokens), base.css, index.css
  test/         setup, MSW handlers, render helper, viewport mock, tests
```

**Dependencies added in this pass:** only `vitest-axe` (dev only, about 4 packages including axe-core), for automated accessibility checks in tests. No runtime dependencies were added; the UI primitives and icons are written in-house.

## Try the two-user conflict

1. Open the app in **two browser tabs** and open the same contact in both.
2. Type `User A` into **Acting as** in one tab and `User B` in the other. The name is kept **per tab** and sent as `X-Actor`.
3. In tab B change the phone and **Save**. In tab A change the phone (or company) and **Save**.
4. Tab A shows the conflict dialog: your value next to the latest one, with the fields someone else changed in red. **Keep editing** (or Escape), **Discard mine & reload**, or **Apply my changes on top**. The timeline records who changed what.

## Tested scenarios

Automated (`npm test`), plus a manual pass in Chrome on 2026-10-16 against the real API with 5,000 seeded contacts.

**List**
- [x] Skeleton while loading; "server is taking longer than usual" notice after 3 s
- [x] Search is debounced (one request per pause) and written to the URL; the previous results stay visible while the next ones load
- [x] Tag filter (any/all) in a popover: Escape closes it and focus returns to the trigger (an outside click also closes it; not covered by a test)
- [x] Company and date filters; a date range that ends before it starts is flagged
- [x] "Clear all" in the toolbar and "Clear filters" in the empty state reset the URL and the inputs
- [x] Sort from the menu or the column headers (`aria-sort` reflects it)
- [x] Next / Previous over keyset cursors; the total is remembered on later pages; filters reset to page 1
- [x] Expired or tampered cursor → back to page 1 with a notice, not an error
- [x] Failed page load → previous rows stay, inline error with Retry; first-load failure → error state with Retry
- [x] Request timeout → "taking too long" with Retry; a stale request is cancelled when the view changes
- [x] Hand-edited URL values (bad sort, limit, dates, duplicate tags) are sanitized before the API call
- [x] Selection, select-all (with the mixed state), bulk tag with success / partial (warning) / failure (selection kept)
- [x] Double submit of the bulk bar is ignored while applying
- [x] Long names, emails, companies and tags truncate with the full text on hover

**Contact page**
- [x] Skeleton of the whole layout; "Contact not found" for unknown and malformed ids; Retry for other load errors
- [x] Header shows version, created date and last update (exact time on hover)
- [x] Inline validation on change and blur, mirroring the backend rules; Save disabled while invalid or clean
- [x] Only changed fields are sent, with the loaded version; "Changes saved" toast; the activity refreshes
- [x] Server 400 field errors and 409 EMAIL_TAKEN shown under the right field; nothing typed is lost
- [x] Save failure (500) keeps the edits and offers Retry, which sends the same change
- [x] Double submit (click, Enter) sends one PATCH; the button shows "Saving…"
- [x] Conflict dialog: only fields someone else changed are flagged; Keep editing / Escape, Discard, Apply on top
- [x] Dialog keyboard: focus starts on the safe choice, Tab is trapped, Escape closes, focus returns to Save
- [x] Leaving with unsaved edits asks first (Stay / Leave, Escape = Stay); the browser prompt is armed only while dirty
- [x] "Back to contacts" returns to the same search, filters and sort
- [x] Tag add (normalized) and remove with feedback; invalid and duplicate tags are rejected before sending
- [x] Timeline: who, what (badge), when (relative, exact time on hover), old → new values

**Layout and accessibility**
- [x] 360 px: card list, filters behind a toggle, single-column form, full-width dialog actions
- [x] 768 px: table scrolls inside its card with pinned name column; filters in two columns
- [x] 1280 px: table fits; detail form and side column side by side
- [x] No horizontal page scroll at 360 / 768 / 1280 px; touch targets ≥ 40 px (44 px on touch screens)
- [x] axe: no violations on the list (desktop and phone), empty state, contact page, conflict dialog, leave dialog
- [x] Contrast: every token pair measured ≥ 4.5:1 for text, ≥ 3:1 for control borders (light and dark)
- [x] Console: no app errors or warnings in normal flows (the browser's own network lines appear only in error flows)
