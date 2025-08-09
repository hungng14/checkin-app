import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/config/supabase";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get?.(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set?.(name, value, options);
        } catch {
          // no-op in readonly contexts
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set?.(name, "", { ...options, maxAge: 0 });
        } catch {
          // no-op in readonly contexts
        }
      },
    },
  });
}

