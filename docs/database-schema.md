# Database Schema Documentation

This document describes the complete database structure, relationships, Row Level Security (RLS) policies, and migration process for the Check-In App using Drizzle ORM and Supabase PostgreSQL.

## Overview

The Check-In App uses a PostgreSQL database hosted on Supabase with the following key features:

- **ORM**: Drizzle ORM for type-safe database operations
- **Migrations**: Versioned schema migrations with Drizzle Kit
- **Security**: Row Level Security (RLS) policies for data access control
- **Authentication**: Integration with Supabase Auth system
- **Storage**: Supabase Storage for file management

## Database Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   auth.users    │    │    profiles     │    │    checkins     │
│   (Supabase)    │    │                 │    │                 │
│ - id (UUID)     │───▶│ - user_id (FK)  │◀───│ - user_id (FK)  │
│ - email         │    │ - username      │    │ - photo_url     │
│ - created_at    │    │ - display_name  │    │ - created_at    │
└─────────────────┘    │ - background_url│    │ - location      │
                       └─────────────────┘    │ - device_info   │
                                              └─────────────────┘
                                                       │
                       ┌─────────────────┐            │
                       │     follows     │            │
                       │                 │            │
                       │ - follower_id   │            │
                       │ - following_id  │            │
                       │ - created_at    │            │
                       └─────────────────┘            │
                                                      │
                       ┌─────────────────┐            │
                       │ Storage Buckets │            │
                       │                 │            │
                       │ - checkin-photos│◀───────────┘
                       │ - user-backgrounds
                       └─────────────────┘
```

## Table Schemas

### 1. profiles

User profile information and customization settings.

**Drizzle Schema** (`src/db/schema.ts`):
```typescript
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(), // References auth.users(id)
  username: text("username").notNull().unique(),
  displayName: text("display_name"),
  backgroundUrl: text("background_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});
```

**SQL Definition**:
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  background_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Columns**:
- `id`: Primary key (UUID)
- `user_id`: Foreign key to `auth.users(id)` (Supabase Auth)
- `username`: Unique username for the user
- `display_name`: User's display name
- `background_url`: URL to custom dashboard background image
- `updated_at`: Last update timestamp

**Indexes**:
```sql
CREATE UNIQUE INDEX profiles_username_unique ON profiles(username);
CREATE INDEX profiles_user_id_idx ON profiles(user_id);
```

### 2. checkins

Daily check-in records with photos and metadata.

**Drizzle Schema**:
```typescript
export const checkins = pgTable("checkins", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  photoUrl: text("photo_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  location: text("location"),
  deviceInfo: text("device_info"),
});
```

**SQL Definition**:
```sql
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  location TEXT,
  device_info TEXT
);
```

**Columns**:
- `id`: Primary key (UUID)
- `user_id`: Foreign key to `auth.users(id)`
- `photo_url`: URL to the check-in photo in Supabase Storage
- `created_at`: Timestamp when check-in was created
- `location`: Optional location information (coordinates or address)
- `device_info`: Optional device/browser information

**Indexes**:
```sql
CREATE INDEX checkins_user_id_created_at_idx ON checkins(user_id, created_at DESC);
CREATE INDEX checkins_created_at_idx ON checkins(created_at DESC);
```

### 3. follows

Social following relationships between users.

**Drizzle Schema**:
```typescript
export const follows = pgTable("follows", {
  id: uuid("id").primaryKey().defaultRandom(),
  followerId: uuid("follower_id").notNull(),
  followingId: uuid("following_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique().on(table.followerId, table.followingId),
]);
```

**SQL Definition**:
```sql
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT follows_follower_id_following_id_unique UNIQUE(follower_id, following_id)
);
```

**Columns**:
- `id`: Primary key (UUID)
- `follower_id`: User who is following (references `auth.users(id)`)
- `following_id`: User being followed (references `auth.users(id)`)
- `created_at`: Timestamp when follow relationship was created

**Constraints**:
- Unique constraint on `(follower_id, following_id)` prevents duplicate follows
- Foreign key constraints ensure referential integrity

## Row Level Security (RLS) Policies

### profiles Table Policies

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "profile is self" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow public read access to usernames for search functionality
CREATE POLICY "public username read" ON profiles
  FOR SELECT USING (true);
```

### checkins Table Policies

```sql
-- Enable RLS
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

-- Users can view their own check-ins
CREATE POLICY "read own checkins" ON checkins
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own check-ins
CREATE POLICY "insert own checkins" ON checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users cannot update or delete check-ins (immutable records)
```

### follows Table Policies

```sql
-- Enable RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Users can view follows where they are involved
CREATE POLICY "view own follows" ON follows
  FOR SELECT USING (
    auth.uid() = follower_id OR auth.uid() = following_id
  );

-- Users can create follows where they are the follower
CREATE POLICY "create own follows" ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- Users can delete follows where they are the follower
CREATE POLICY "delete own follows" ON follows
  FOR DELETE USING (auth.uid() = follower_id);
```

## Storage Buckets and Policies

### checkin-photos Bucket

**Configuration**:
- **Name**: `checkin-photos`
- **Public**: Yes (for public read access)
- **File Size Limit**: 10MB
- **Allowed MIME Types**: `image/jpeg`, `image/png`, `image/webp`

**Path Structure**: `checkins/{user_id}/{timestamp}.jpg`

**Storage Policies**:
```sql
-- Allow public read access to all photos
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'checkin-photos');

-- Allow authenticated users to upload to their own folder
CREATE POLICY "User upload access" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'checkin-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own photos
CREATE POLICY "User delete access" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'checkin-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

### user-backgrounds Bucket

**Configuration**:
- **Name**: `user-backgrounds`
- **Public**: Yes (for public read access)
- **File Size Limit**: 5MB
- **Allowed MIME Types**: `image/jpeg`, `image/png`, `image/webp`

**Path Structure**: `backgrounds/{user_id}/{timestamp}.{ext}`

**Storage Policies**: Similar to `checkin-photos` but for background images.

## Drizzle ORM Configuration

### Configuration File

**Location**: `drizzle.config.ts`

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
  strict: true,
});
```

### Database Connection

**Location**: `src/config/database.ts`

```typescript
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Client } from "pg";

export function createDrizzle(): { db: NodePgDatabase; client: Client } {
  const client = new Client({ 
    connectionString: process.env.DATABASE_URL 
  });
  const db = drizzle(client);
  return { db, client };
}
```

### Type Definitions

**Location**: `src/db/schema.ts`

```typescript
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Checkin = typeof checkins.$inferSelect;
export type NewCheckin = typeof checkins.$inferInsert;
export type Follow = typeof follows.$inferSelect;
export type NewFollow = typeof follows.$inferInsert;
```

## Migration Process

### Available Commands

```bash
# Generate migration files from schema changes
pnpm db:generate

# Apply migrations to database
pnpm db:migrate

# Open Drizzle Studio for database inspection
pnpm db:studio
```

### Migration History

**Location**: `drizzle/meta/_journal.json`

Current migrations:
1. **0000_rapid_tyrannus**: Initial schema (profiles, checkins)
2. **0001_flippant_kronos**: Added follows table and display_name
3. **0002_add_username_and_user_id**: Added username and user_id columns

### Migration Files

**Example Migration** (`drizzle/0000_rapid_tyrannus.sql`):
```sql
CREATE TABLE "checkins" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "photo_url" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "location" text,
  "device_info" text
);

CREATE TABLE "profiles" (
  "id" uuid PRIMARY KEY NOT NULL,
  "background_url" text,
  "updated_at" timestamp with time zone
);
```

## Database Setup Instructions

### 1. Environment Configuration

Create `.env.local` with database connection:
```env
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon_key]
```

### 2. Initial Setup

```bash
# Install dependencies
pnpm install

# Generate initial migration
pnpm db:generate

# Apply migrations
pnpm db:migrate
```

### 3. Supabase Configuration

1. **Create Storage Buckets**:
   - `checkin-photos` (public)
   - `user-backgrounds` (public)

2. **Apply RLS Policies**:
   Run the SQL commands from this document in Supabase SQL Editor

3. **Configure Auth**:
   - Enable email authentication
   - Set up email templates
   - Configure redirect URLs

### 4. Verify Setup

```bash
# Open Drizzle Studio to inspect database
pnpm db:studio

# Check tables and data in browser at http://localhost:4983
```

## Performance Considerations

### Indexing Strategy

- **Primary Keys**: All tables use UUID primary keys with `gen_random_uuid()`
- **Foreign Keys**: Indexed automatically by PostgreSQL
- **Query Optimization**: Composite indexes on frequently queried columns
- **Time-based Queries**: Indexes on timestamp columns for efficient sorting

### Connection Management

- **Connection Pooling**: Handled by Supabase/PostgreSQL
- **Connection Lifecycle**: Create and close connections per request
- **Error Handling**: Proper cleanup in `finally` blocks

### Query Optimization

```typescript
// Efficient check-in history query
const { rows } = await client.query(
  `SELECT id, user_id, photo_url, created_at, location, device_info
   FROM checkins
   WHERE user_id = $1
   ORDER BY created_at DESC
   LIMIT 30`,
  [user.id]
);
```

## Security Best Practices

### Data Access Control

- **RLS Policies**: Enforce user-level data isolation
- **Authentication**: All queries use authenticated user context
- **Input Validation**: Parameterized queries prevent SQL injection
- **Authorization**: API routes verify user permissions

### Data Privacy

- **User Isolation**: Users can only access their own data
- **Photo Privacy**: Storage policies enforce user-scoped access
- **Metadata Protection**: Device info anonymized, no PII stored

## Troubleshooting

### Common Issues

1. **Migration Failures**:
   - Check DATABASE_URL environment variable
   - Verify Supabase connection
   - Review migration SQL for syntax errors

2. **RLS Policy Errors**:
   - Ensure policies are applied correctly
   - Check `auth.uid()` context in queries
   - Verify user authentication state

3. **Connection Issues**:
   - Verify database credentials
   - Check network connectivity
   - Review connection string format

### Debug Tools

- **Drizzle Studio**: Visual database inspection
- **Supabase Dashboard**: Query logs and performance metrics
- **PostgreSQL Logs**: Detailed query execution information

### Monitoring

- **Query Performance**: Monitor slow queries in Supabase Dashboard
- **Connection Usage**: Track connection pool utilization
- **Storage Usage**: Monitor file storage consumption
- **RLS Policy Performance**: Check policy execution times
