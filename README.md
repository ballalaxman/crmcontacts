# CRM Contact Workspace

Browse, search, filter, sort and edit CRM contacts, with tags, bulk tagging, an activity history and safe handling of concurrent edits.

## Tech stack

Two independent projects that talk only over HTTP:

| | Folder | Stack | Port |
|---|---|---|---|
| API | [`backend/`](backend/README.md) | Node · Express 5 · TypeScript · Mongoose · Zod · MongoDB | 4000 |
| Web app | [`frontend/`](frontend/README.md) | React 18 · TypeScript · Vite · TanStack Query · React Hook Form · React Router | 5173 |

Tests: Vitest, Supertest and an in-memory MongoDB replica set (backend); Vitest, Testing Library, MSW and axe (frontend).

**Why React instead of Vue (the brief's preference):** _TODO — your reason, in your words (for example: it's the framework you use in production, so the time went into correctness instead of learning a new framework)._

Frontend design choices are explained in [`frontend/DECISIONS.md`](frontend/DECISIONS.md); the audit behind them is in [`frontend/AUDIT.md`](frontend/AUDIT.md).

## Run it

Node 20+ is required (built and tested on Node 24). Three terminals:

```bash
# terminal 1 — local MongoDB replica set (leave running)
cd backend
npm install
cp .env.example .env
npm run db:start

# terminal 2 — sample data (once), then the API
cd backend
npm run seed:reset
npm run dev

# terminal 3 — the web app
cd frontend
npm install
cp .env.example .env
npm run dev
```

`.env` files are git-ignored; `cp .env.example .env` creates them (on Windows cmd use `copy`). Open <http://localhost:5173>. The first `db:start` (or `npm test`) downloads a ~600 MB MongoDB binary once; the backend README explains why the database must be a replica set, and gives a Docker alternative.

**Using MongoDB Atlas instead:** put your Atlas URL in `backend/.env` as `MONGODB_URI`, including the database name (`…mongodb.net/CRMCONTACTS`), and allow your IP under Atlas *Network Access*. Skip `db:start`, then run `npm run seed` once (`seed:reset` wipes the contacts, activities and tags first).

Tests: `npm test` in each folder (backend 72, frontend 124 including accessibility checks).

## Important technical decisions

### Frontend

- **Structure:** generic building blocks in `components/ui` (button, fields, dialog, popover, toast, skeleton; written in-house, no UI library), everything contact-specific in `features/contacts` (list, detail, tags, activity, each with its own hooks and components), and thin `pages/` that only compose. Logic lives in hooks (`useContactList`, `useContactDetail`, `useBulkSelection`), so components stay presentational.
- **State has one home per kind:** the URL for search, filters and sort (bookmarkable, survives reload and Back), TanStack Query for server data (caching, cancelling stale requests, keeping the previous page visible while the next loads), local state for selection and dialogs, and context only for the API client, the query cache and toasts.
- **Every state the brief lists is designed:**
  - *Loading:* skeletons shaped like the real layout, plus a notice if the first load is slow.
  - *No results:* an empty state with a "Clear filters" action.
  - *Invalid input:* inline errors using the same rules as the backend; server field errors (400, `EMAIL_TAKEN`) appear under the right field; Save stays disabled while anything is invalid.
  - *Failures:* Retry everywhere. A failed page load keeps the previous rows, a failed save keeps your edits, and an expired page cursor returns to page 1.
  - *Conflicts:* a dialog that marks only the fields someone else changed, with Keep editing, Discard mine, or Apply my changes on top.
- **Safe editing:** the form sends only the changed fields plus the version it loaded, Save can't be submitted twice, and leaving the page with unsaved edits asks first.
- **One error path:** every failure (HTTP error, network, timeout) becomes one typed `ApiError`. Reads retry only on network and 5xx errors; saves never retry automatically.
- **Responsive and accessible:** cards and folded filters on phones, a scrollable table with a pinned name column on tablets, 40 px touch targets, full keyboard support in dialogs (Escape, trapped Tab, focus returned), axe checks in the tests, and colour contrast measured for the light and dark themes.
- **Tests:** 124 (Testing Library + MSW) covering the list, filters and paging, bulk tagging, editing, the conflict flow, the unsaved-changes guard, the hooks and accessibility.

### Backend

- **Layered backend:** routes → controllers → services → ports ← Mongo repositories, wired in one place, so business rules never touch Express or Mongoose.
- **Everything list-related happens on the server, sized for millions of rows.** Keyset (cursor) pagination with an `_id` tie-breaker (never `skip`), a count capped at 10,000 ("10,000+"), and compound indexes for the common filter-plus-sort combinations.
- **Search is an anchored prefix match** on lowercased, indexed fields: name in either order ("smith jo" finds John Smith), email, and phone digits regardless of formatting. Checked with `explain()`: 21 index keys examined for 20 results, not a scan.
- **Email uniqueness is enforced by the database** (a partial unique index, so contacts without an email don't collide). There is no check-then-write race; a duplicate becomes `409 EMAIL_TAKEN`.
- **An edit and its activity entry** are written in one MongoDB transaction: both happen or neither does.
- **One contract, validated on the server.** The backend's Zod schemas are the source of truth; the frontend mirrors the types and form rules for instant feedback, but the backend never trusts the client.
## Data model

**`contacts`**

| Field | Type | Notes |
|---|---|---|
| `firstName`, `lastName` | string | Required, 1–100 characters |
| `email` | string, optional | Stored lowercased. Unique when present. Clearing it removes the field (never `null`) |
| `phone` | string, optional | Stored as typed; 7–15 digits |
| `company` | string, optional | |
| `tags` | string[] | Lowercase `a-z 0-9 -`, 1–30 characters |
| `version` | number | Optimistic-lock counter, +1 on every profile edit |
| `createdAt`, `updatedAt` | date | |
| `nameKeys`, `sortName`, `phoneKeys`, `companyLower` | derived | Search and sort helpers, all computed by one domain function so they can't drift |

Indexes: `email` (unique, partial), `nameKeys`, `phoneKeys`, `{createdAt, _id}`, `{sortName, _id}`, `{tags, createdAt, _id}`, `{companyLower, createdAt, _id}`.

**`activities`**: `contactId`, `type` (`CONTACT_UPDATED`, `TAG_ADDED`, `TAG_REMOVED`), `changes` (`[{ field, from, to }]` for updates), `tag` (for tag events), optional `actor`, `createdAt`. Index `{contactId, createdAt, _id}` for "recent activity".

**`tags`**: `name` (unique), `createdAt`. A small registry for the filter and autocomplete, so the app never runs `distinct` over millions of contacts.

## Concurrent update approach

**Optimistic locking with a `version` number.**

1. User A and User B both open the contact at version 3.
2. B saves: the request carries `version: 3` plus only the changed fields. The server applies it and the contact becomes version 4.
3. A saves with `version: 3`. The server answers **409 `VERSION_CONFLICT`** with the current contact, and **nothing is overwritten**.
4. A sees a dialog listing their value next to the latest one, with the fields someone else changed marked in red. A chooses **Keep editing**, **Discard mine & reload**, or **Apply my changes on top** (an explicit, informed overwrite using version 4).

**Why it is race-safe:** the write itself is conditional: update only where `_id` matches *and* `version = 3`, bumping the version in the same operation. Even if two saves arrive at the same instant, only one can match; the other gets the 409. A backend test fires two simultaneous PATCHes and checks that exactly one wins.

**Tags don't bump the version.** Adding or removing a tag is an atomic `$addToSet` / `$pull` that can't clobber profile fields, so tagging a contact never causes a pointless conflict for someone editing its phone number.

**Why not locks:** pessimistic locks need leases, timeouts and clean-up for abandoned locks, and they block people who never save. Optimistic locking costs nothing when there's no conflict, which is the normal case in a CRM. (The brief also says distributed locking isn't required.)

## Known issues / incomplete

- **No authentication**: it's not in the brief's scope. "Acting as" is a per-tab display name (`X-Actor`) used to label the history and to demo two users. With more time: sign-in through an identity provider (OAuth/OIDC) with the session in an httpOnly cookie, an `accountId` on every contact as the first key of every query and index, and the activity's "who" taken from the signed-in user.
- No create or delete contact (not asked for); data comes from the seed script.
- Bulk tagging applies to the selected rows of the current page, not to "everything matching the filter".
- Search is prefix-only (no fuzzy or middle-of-word matching); the company filter is a prefix too.
- Conflicts are detected when you save, not live (there is no realtime push).
- The total count is capped at 10,000.

## Scale considerations

| Scenario | What would change |
|---|---|
| Millions of contacts per account | Add `accountId` as the first key of every index and query (multi-tenancy) and shard on it. Keep keyset pagination; replace counts with estimates or cached facet counts; archive old activities. |
| Millions of updates per day | Write activity through a transactional outbox or change streams instead of synchronously; run bulk jobs in a queue with workers and progress; batch with `bulkWrite`; watch the cost of each extra index. |
| Frequent searches and filters | Move search to Atlas Search / OpenSearch fed by change streams (fuzzy, infix, facets); cache tag lists and facet counts; read from secondaries where slight staleness is fine. |
| Many simultaneous users | Stateless API replicas behind a load balancer, tuned connection pools, per-user rate limits, realtime updates (SSE/WebSocket) so open pages refresh and most conflicts never happen, a CDN for the web app, and tracing/metrics. |

## AI usage

- **Tool:** Claude (Claude Code).
- **Used for:** implementing the frontend and backend from my implementation plan, writing the tests, and drafting the documentation.
- **A suggestion I changed:** the plan stored the "Acting as" name in `localStorage`. That storage is shared by every tab, so naming one tab "User B" silently changed who the other tab acted as, which broke the two-user conflict demo. I switched it to `sessionStorage`, which is per tab.
