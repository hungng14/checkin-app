import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ChangeBackground from "@/components/ChangeBackground";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin");

  const { data: profile } = await supabase.from("profiles").select("background_url").eq("id", user.id).maybeSingle();
  const { data: recent } = await supabase
    .from("checkins")
    .select("id, photo_url, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(6);

  return (
    <main className="min-h-dvh">
      <section className="relative h-56 w-full overflow-hidden rounded-b-xl">
        {profile?.background_url ? (
          <Image src={profile.background_url} alt="Background" fill className="object-cover" priority />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">No background</div>
        )}
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-x-0 bottom-4 flex items-center justify-between px-4">
          <h1 className="text-xl font-semibold text-white">Welcome</h1>
          <ChangeBackground />
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Recent Check-ins</h2>
          <Link href="/history" className="text-sm text-primary underline">
            View all
          </Link>
        </div>
        {recent && recent.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {recent.map((c) => (
              <Link
                key={c.id}
                href={`/history/${c.id}`}
                className="group relative block aspect-square overflow-hidden rounded-md animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.photo_url}
                  alt="Checkin"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute bottom-0 w-full bg-black/40 p-1 text-[11px] text-white">
                  {new Date(c.created_at).toLocaleString()}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No check-ins yet.</p>
        )}
      </section>
    </main>
  );
}

