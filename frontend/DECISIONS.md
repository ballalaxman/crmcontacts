# Frontend decisions

Why the frontend is built the way it is. Each section says what was chosen, why, and what it costs.

## 1. Folder structure

```
src/
  app/            wiring: routes, providers, QueryClient policy, app shell, route error page
  api/            transport only: http-client (fetch → ApiError), ApiProvider (dependency injection)
  contracts/      mirror of the backend contract: DTO types, enums, limits, form validation rules
  components/
    ui/           generic primitives: Button, TextField, Checkbox, Dialog, Popover, Toast, Badge, Chip…
    layout/       app-specific pieces shared by pages: PageHeader, ActorSwitcher, notices
  features/
    contacts/
      api/        ContactsApi (the interface the UI depends on) + query keys
      hooks/      server state: queries.ts, mutations.ts
      list/       list screen logic (hooks) and its components
      detail/     contact form, conflict dialog, unsaved-changes guard, useContactDetail
      tags/       chips, tag input, tag validation hook
      activity/   activity timeline
      contacts.css
  hooks/          generic hooks (media query, debounce, document title, online status)
  lib/            pure helpers: format, error messages, constants, breakpoints, guards
  pages/          thin screens that only compose features
  styles/         tokens.css, base.css, index.css (import order)
  test/           test setup, MSW handlers, render helper, tests
```

The rule is that dependencies point downward. `pages` import `features`; `features` import `components/ui`, `hooks`, `lib` and `contracts`; `components/ui` imports nothing app-specific. Nothing imports from `pages`. The one feature is `contacts`, but the layout leaves room for a second one (say `companies`) without touching the first.

**Why not one folder per type (`components/`, `hooks/`)?** That was the old layout. Every change to the list screen touched four folders, and generic and contact-specific code sat side by side. Grouping by feature keeps a screen's hooks, components and styles together. A small `ui` layer that knows nothing about contacts keeps the generic parts reusable.

## 2. State management

There are four kinds of state, and each has exactly one home:

| Kind | Where it lives | Examples |
|---|---|---|
| Shareable view state | **The URL** | search, tag filter, company, dates, sort, page size |
| Server state | **TanStack Query** cache | contact pages, a contact, activity, tags |
| UI state | **Local `useState`** in the hook or component that owns it | selection, cursor stack, open dialogs, form values, "filters open" |
| Truly global | **Context** (only three) | QueryClient, the `ContactsApi` instance, toasts |

Why this split:
- **URL for filters.** A filtered view can be bookmarked, shared and restored with Back, and a reload doesn't lose it. Values from the URL are sanitized (`list-params.ts`) because users can edit them.
- **TanStack Query for server data.** It handles caching, deduplication, cancellation, retries and "keep the previous page while the next loads". Writing that by hand is where bugs live.
- **Local state for the rest.** Selection belongs to the rows on screen, so it lives in `useBulkSelection` and resets when the view changes. The cursor stack lives in `useCursorPagination`. Nothing needs a global store.
- **"Acting as" is not context.** It is read straight from `sessionStorage` per request, which keeps it per tab (two tabs can be User A and User B).

Logic lives in hooks and components stay presentational. `useContactList` returns everything the list shows; `useContactDetail` does loading, saving, conflict resolution and tags for the detail screen. The pages only lay things out.

Memoization is used where it changes behaviour, not by default: parsed URL params (stable object, stable query key), server field errors (so the form's effect doesn't re-run), and the toast API (stable context value). There is no `React.memo`; nothing measured slow.

## 3. Component hierarchy

```
main.tsx
└─ AppProviders (QueryClient · ApiProvider · ToastProvider)
   └─ RouterProvider (data router, app/routes.tsx)
      └─ AppShell (skip link · header: brand + ActorSwitcher · OfflineNotice · <Outlet/> · ScrollRestoration)
         ├─ ContactsListPage            useContactList · useBulkSelection · useBulkTagAction
         │  ├─ PageHeader
         │  ├─ ListToolbar              search (DebouncedField) · sort (SelectField) · Filters toggle (phones)
         │  │  └─ filters               TagFilter (Popover) · company (DebouncedField) · date fields
         │  ├─ SlowServerNotice         after 3 s of first load
         │  ├─ ContactListResults       one of: ListSkeleton | ErrorState | EmptyState | rows
         │  │  ├─ ContactsTable         ≥ 768 px, sortable headers, pinned name column on tablets
         │  │  ├─ ContactCardList       < 768 px
         │  │  └─ ListPagination
         │  └─ BulkActionBar            while rows are selected
         ├─ ContactDetailPage           useContactDetail
         │  ├─ PageHeader               version · RelativeTime · "Unsaved changes" badge
         │  ├─ ContactForm              react-hook-form + the mirrored Zod schema
         │  ├─ TagsCard → TagChips · TagInput
         │  ├─ ActivityTimeline
         │  ├─ ConflictDialog           on 409 VERSION_CONFLICT
         │  └─ UnsavedChangesGuard      mounted only while the form is dirty
         └─ NotFoundPage
```

## 4. Design tokens

All visual values come from `styles/tokens.css`: colour (surfaces, text, accent, four statuses, control borders, focus), a 4 px spacing scale, a type scale with a fluid page title (`clamp`), radii, shadows, z-index layers, motion durations and control heights. Components use only tokens, so the light and dark themes are just two sets of values, and `prefers-reduced-motion` sets durations to zero.

**Contrast was measured, not guessed.** jsdom can't compute contrast (so axe skips that rule in tests), so every text and background pair was checked with the WCAG formula:

| | Lowest text pair | Control borders vs surface (needs 3:1) |
|---|---|---|
| Light | 5.52:1 (muted text on the table header) | 3.05–3.30:1 |
| Dark | 6.00:1 (accent on surface) | 3.64–3.98:1 |

The audit found one failing pair in the old colours (muted text on the table header, 4.44:1); the new tokens fix it.

**Touch targets:** controls are 40 px tall (44 px on coarse pointers). Checkboxes and tag "×" buttons draw small but have a 40 px hit area. At 360 px the audit counted 48 undersized targets; afterwards there are none. (The list's name links measure 23 px, but each one stretches over its whole card.)

## 5. Error handling

One path from the network to the screen:

1. **`api/http-client.ts`** turns every failure into an `ApiError` with `status`, a typed `code`, `message` and parsed `fieldErrors`. That includes no connection (`NETWORK_ERROR`), a configurable timeout (`TIMEOUT`, default 30 s, `VITE_API_TIMEOUT_MS`) and non-JSON error bodies. A request the caller cancelled is rethrown as an abort, so it is never shown as an error.
2. **`app/query-client.ts`** decides retries: never for 4xx (asking again won't help), up to 2 with backoff for network, timeout and 5xx. Mutations are never retried automatically, because a retried PATCH could hide a conflict.
3. **Each screen maps codes to the right place:**

| Error | Where the user sees it |
|---|---|
| `VALIDATION_ERROR` field errors | under the matching field |
| `EMAIL_TAKEN` | under Email |
| `VERSION_CONFLICT` | conflict dialog (keep editing, discard, or apply on top) |
| `INVALID_CURSOR` | list silently returns to page 1, with an info toast |
| `NOT_FOUND`, malformed id | "Contact not found" screen |
| failed refetch while rows are on screen | rows stay (dimmed), inline error with Retry |
| first load fails | error state with Retry |
| failed save (network/5xx/429) | banner above the form ("your edits are still in the form") with Retry |
| tag and bulk actions | toast (success, warning for partial bulk results, error) |
| render crash | the route `errorElement` |

Messages come from one lookup (`lib/error-messages.ts`), so a new code is one line.

## 6. Responsive strategy

- **Breakpoints:** 768 px (phone vs tablet) and 1024 px (tablet vs desktop). The numbers live in `lib/breakpoints.ts` and in the CSS `@media` rules, because CSS variables can't be used in media queries.
- **Phones (< 768 px):** contacts render as **cards** (a list, not a squeezed table), and the filters fold behind a **Filters** toggle that shows how many are active. This needs a different component tree, so it is chosen in JavaScript (`useMediaQuery`), not with CSS alone.
- **Tablets (768–1023 px):** the table scrolls sideways **inside its own card**, with the checkbox and name columns pinned. Filters sit in two columns.
- **Desktop (≥ 1024 px):** everything fits; the detail page puts the form and the tags/activity column side by side.
- **Fluid sizing:** `minmax`, `clamp` and `min()` instead of fixed widths; there is no horizontal page scroll at 360, 768 or 1280 px (measured).

## 7. Trade-offs

- **Own primitives instead of a component library.** No new runtime dependencies and full control of markup and styles. The cost is owning the focus trap, popover and dialog behaviour; they are small and covered by tests (Escape, Tab wrapping, focus return, axe).
- **Two list layouts chosen in JavaScript.** Semantically right on both sizes (a table on desktop, a list on phones), but a resize across 768 px swaps the DOM. Selection survives because it lives in a hook, not in the rows.
- **Data router (`createBrowserRouter`).** Needed for `useBlocker` (the unsaved-changes guard) and `ScrollRestoration`. Together with the new primitives it grew the bundle from 321 KB to 393 KB (122 KB gzipped). That is acceptable for an internal tool; route-level code splitting would win it back if needed.
- **Validation on change and on blur.** Save stays disabled while anything is invalid, and every reason is visible under its field, so the disabled button is never a mystery. The cost is that an error can appear while you are still typing an email.
- **Stale rows on a failed refetch.** Better than a blank table, but those rows may not match the new filters; the inline error says "showing the previous results".
- **The contact and its activity load in parallel.** Faster on the normal path; for a missing contact that means two 404s instead of one.
- **A hand-written contract mirror.** Two short files, and the backend validates everything anyway. Generating them from OpenAPI is the next step.
- **A custom Vitest environment** (`test/jsdom-environment.ts`): jsdom's `AbortSignal` is rejected by Node's `fetch`, so tests keep Node's. Browsers have only one implementation, so this affects tests only.

## 8. Known limitations

- No authentication; "Acting as" is a per-tab display name.
- No realtime updates, so a conflict is found when you save, not before.
- Bulk tagging covers the selected rows on the current page, not "everything matching the filter".
- The tag filter lists every tag; with hundreds it would need search.
- The timeline shows the latest 20 entries, with no "load more".
- After **Discard mine & reload**, focus can't go back to Save (Save is disabled because the form is clean), so it falls back to the page.
- Chrome writes its own "Failed to load resource" console line for every non-2xx response. That happens only in error flows (conflict, 404, server down) and can't be suppressed from JavaScript. The app itself logs nothing.

## 9. What I would do next

1. Generate `contracts/` from an OpenAPI spec produced from the backend Zod schemas.
2. Push contact changes over SSE, so an open page can warn "someone just edited this" before anyone saves.
3. Run Playwright end-to-end tests in Chromium, Firefox and WebKit, plus screenshot tests at the three widths.
4. Add Storybook for `components/ui`, with the axe add-on.
5. Make "tag all matching the filter" a background job with progress.
6. Add "Load more" for the timeline, and search inside the tag filter.
