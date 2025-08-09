## Check-In App — Flow & Architecture

### Overview
Mobile‑first check‑in app built with Next.js App Router, TypeScript, Supabase (Auth/DB/Storage), TailwindCSS, and Framer Motion. Users can authenticate, take a photo to check in, view history, and customize their dashboard background.

### Core Flows
- **Authentication**: Email/password and optional OAuth via Supabase Auth. Persistent session via cookies using `@supabase/ssr`.
- **Check‑in**: Capture photo from camera, upload to Storage (`checkin-photos`), insert DB row in `checkins` with timestamp, photo URL, and optional location/device info. Prevent duplicate check‑ins within a configurable window.
- **History**: Paginated list of user’s check‑ins with details page per item.
- **Background**: Upload a custom dashboard background to Storage (`user-backgrounds`) and persist URL in `profiles.background_url`.

### Data Model (SQL)
```
-- Table: public.profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  background_url text,
  updated_at timestamptz default now()
);

-- Table: public.checkins
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_url text not null,
  created_at timestamptz not null default now(),
  location text,
  device_info text
);

-- Indexes
create index if not exists idx_checkins_user_created_at on public.checkins(user_id, created_at desc);

-- Storage buckets (create via Dashboard):
-- 1) checkin-photos (public)
-- 2) user-backgrounds (public)

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.checkins enable row level security;

-- profiles policies
create policy "profile is self" on public.profiles
  for select using (auth.uid() = id);
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- checkins policies
create policy "read own checkins" on public.checkins
  for select using (auth.uid() = user_id);
create policy "insert own checkins" on public.checkins
  for insert with check (auth.uid() = user_id);

-- Storage policies (example for public buckets)
-- Grant public read, user‑scoped write
-- In Storage Policies, create rules that allow:
--   Read: anyone
--   Insert/Update/Delete: auth.uid() = user_metadata.user_id on object path prefix matching the user id
```

### Environment
Set in `.env.local` (do not commit):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Routes
- `/auth/signin`, `/auth/signup`: Auth pages.
- `/dashboard`: Protected landing page; shows background + recent check‑ins + check‑in button.
- `/history`: Paginated list of check‑ins.
- `/history/[id]`: Details view.

### Duplicate Check‑in Window
- Configurable via `CHECKIN_WINDOW_MINUTES` (default 10) in client code. Before insert, query last check‑in for user and block if within window.

### Implementation Notes
- Supabase SSR: use `createServerClient` with Next cookies for server components and route handlers; `createBrowserClient` for client components.
- Images: Next image `remotePatterns` allow `*.supabase.co`.
- UX: Tailwind utility classes; motion for success/empty states.

### Backlog / Future
- OAuth providers, better camera UX, optimistic updates, shadcn/ui components, and PWA offline.


