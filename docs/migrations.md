# Database Migrations (Drizzle)

This project uses Drizzle migrations in `drizzle/*.sql`.

## Run Migrations (Local SQLite)

```bat
set DATABASE_URL=file:./local.db
set DATABASE_AUTH_TOKEN=
npm run db:migrate
```

Notes:
- `src/lib/db/index.ts` throws if `DATABASE_URL` is missing, so you must set it for `npm run build` as well.
- On Windows, ensure `powershell.exe` is available on `PATH` (Drizzle Kit uses it internally).

## Run Migrations (Turso/libSQL)

Set:

- `DATABASE_URL=libsql://...`
- `DATABASE_AUTH_TOKEN=...`

Then run:

```sh
npm run db:migrate
```

## Production

- Run `npm run db:migrate` against the production database before deploying changes that depend on new tables/columns.
- Current important migrations:
  - `0002_auth_timestamps_ms.sql` (normalizes Auth.js timestamps)
  - `0003_user_preferences.sql` (Settings preferences persistence)

