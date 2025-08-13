-- Add username and user_id columns to profiles table
-- This migration handles existing data properly

-- First, add the columns as nullable
ALTER TABLE "profiles" ADD COLUMN "user_id" uuid;
ALTER TABLE "profiles" ADD COLUMN "username" text;

-- Update existing profiles to set user_id = id (since currently id is the auth user id)
UPDATE "profiles" SET "user_id" = "id" WHERE "user_id" IS NULL;

-- Generate unique usernames for existing profiles based on display_name or id
UPDATE "profiles"
SET "username" = CASE
  WHEN "display_name" IS NOT NULL THEN lower(replace("display_name", ' ', '_')) || '_' || substring("id"::text, 1, 8)
  ELSE 'user_' || substring("id"::text, 1, 8)
END
WHERE "username" IS NULL;

-- Now make the columns NOT NULL
ALTER TABLE "profiles" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "profiles" ALTER COLUMN "username" SET NOT NULL;

-- Add unique constraint on username
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_username_unique" UNIQUE("username");

-- Add foreign key constraint to reference auth.users
-- Note: This assumes the auth.users table exists in Supabase
-- ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
