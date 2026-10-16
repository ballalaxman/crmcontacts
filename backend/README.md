# CRM Contacts — API

Node 20+ · Express 5 · TypeScript · Mongoose 8 (MongoDB) · Zod. Standalone project: it shares no code with `../frontend`; the only link is the HTTP API (`/api`).

## Run it locally

You need three things running: a database, the API, and (once) some seed data. No Atlas, Docker or MongoDB install is required.

```bash
npm install
cp .env.example .env  # once; .env is git-ignored (on Windows cmd: copy .env.example .env)
npm run db:start      # terminal 1 — local MongoDB replica set on :27017 (keep it running)
npm run seed:reset    # terminal 2 — 5,000 sample contacts (once; wipes existing data)
npm run dev           # terminal 2 — API on http://localhost:4000/api, restarts on change
```

Check it: <http://localhost:4000/api/health> → `{"status":"ok","db":"up"}`.

`.env.example` points at the local replica set and lists every variable (`MONGODB_URI`, `PORT`, `CORS_ORIGINS`, `SYNC_INDEXES_ON_BOOT`, `TRUST_PROXY`, `SEED_COUNT`). `.env` changes are read at start-up, so restart `npm run dev` after editing it.

### Using MongoDB Atlas instead

Set `MONGODB_URI` in `.env` to your Atlas URL **with the database name**, e.g. `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/CRMCONTACTS` (without a name, MongoDB uses a database called `test`). In Atlas, allow your IP under *Network Access*. Skip `db:start`, and seed once with `npm run seed`. Plain `seed` refuses to touch a database that already has contacts; `seed:reset` wipes the contacts, activities and tags first. Atlas clusters are replica sets, so transactions work there too.

### About the local database

Edits and their activity-log entries are written in one **transaction**, and MongoDB only allows transactions on a replica set. `npm run db:start` runs a single-node replica set using the same `mongod` binary that `mongodb-memory-server` downloads for the tests (~600 MB, once, the first time you run `db:start` or `npm test`; it is cached in `node_modules`). Data lives in `.data/mongo/` and survives restarts; delete that folder to start from nothing. The folder looks large (~300 MB) because MongoDB pre-allocates 100 MB journal files; the data itself is a few MB.

If you prefer Docker (start Docker Desktop first):

```bash
docker run -d --name crm-mongo -p 27017:27017 mongo:7 --replSet rs0 --bind_ip_all
docker exec crm-mongo mongosh --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})'
```

Then use `MONGODB_URI=mongodb://localhost:27017/crm?replicaSet=rs0&directConnection=true`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | API with auto-restart (`tsx watch`) |
| `npm run build` / `npm start` | Compile to `dist/` and run it |
| `npm run db:start` | Persistent local replica set (see above) |
| `npm run seed` / `npm run seed:reset` | Insert sample data / wipe, then insert. `SEED_COUNT=500 npm run seed:reset` for fewer. The data is the same every run. |
| `npm test` | 72 tests against an in-memory replica set (no running DB needed) |
| `npm run typecheck`, `npm run lint` | Static checks |

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | `{ status, db }` |
| GET | `/api/contacts` | `q, tags, tagMode, company, createdFrom, createdTo, sortBy, order, limit, cursor` → `{ items, nextCursor, total? }` |
| GET | `/api/contacts/:id` | |
| PATCH | `/api/contacts/:id` | `{ version, ...changedFields }`; `null` clears an optional field. `409 VERSION_CONFLICT` carries `details.current` |
| POST | `/api/contacts/:id/tags` | `{ tag }` |
| DELETE | `/api/contacts/:id/tags/:tag` | |
| POST | `/api/contacts/bulk/tags` | `{ contactIds (1–500), tag }` → `{ requested, updated, alreadyTagged, notFound }` |
| GET | `/api/contacts/:id/activities` | newest first, `limit` ≤ 100 |
| GET | `/api/tags` | |

Errors always look like `{ "error": { "code", "message", "details?" } }`. An optional `X-Actor` header (a display name, not authentication) is recorded on activity entries so two browser tabs can play "User A" and "User B".

## Design notes

- **Layers:** routes → controllers → services → domain ports ← Mongo repositories, wired in one place (`src/container.ts`). Services only know interfaces from `src/domain/ports.ts`.
- **Contract:** `src/contracts/` (Zod schemas, DTOs, error codes) is the source of truth. The frontend keeps a mirror; this API validates everything regardless.
- **Pagination:** keyset cursors with an `_id` tie-breaker, never `skip`. The count is capped at 10,000.
- **Search:** anchored prefix match on lowercased, indexed fields (`nameKeys`, `email`, `phoneKeys`). The email branch spells out `$type: 'string'` so MongoDB can use the partial unique index (verified with `explain`: 21 keys examined instead of a full scan).
- **Concurrency:** optimistic locking on `version`. The write is conditional (`findOneAndUpdate({ _id, version })`), so exactly one of two simultaneous edits wins. Tag changes are atomic and do not bump the version.
- **Email uniqueness:** partial unique index (race-safe) translated to `409 EMAIL_TAKEN`. Clearing an email uses `$unset`, never `null`.
