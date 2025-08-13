-- Fix RLS policies for the updated profiles table schema
-- The current schema has id as a separate UUID and user_id as the auth user ID

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "profile is self" ON public.profiles;
DROP POLICY IF EXISTS "update own profile" ON public.profiles;
DROP POLICY IF EXISTS "insert own profile" ON public.profiles;

-- Create new policies that use user_id instead of id
CREATE POLICY "profile is self" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
