## Database & Migrations (Drizzle ORM)

Setup:
- Ensure `DATABASE_URL` from your Supabase project is set in `.env.local`.
- Commands:
  - `pnpm db:generate` — generate SQL from schema
  - `pnpm db:migrate` — push migrations
  - `pnpm db:studio` — open Drizzle Studio (local viewer)

Schema lives in `src/db/schema.ts` and mirrors the `profiles` and `checkins` tables used by the app.

Notes:
- You can also create these via Supabase SQL editor. Keeping Drizzle ensures versioned migrations in the repo.
- RLS remains configured in Supabase; server routes perform inserts with authenticated user context.

