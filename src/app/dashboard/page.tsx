import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ChangeBackground from "@/components/ChangeBackground";
import { formatVietnamDateTime } from "@/lib/utils";
import { createDrizzle } from "@/config/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Users, UserPlus } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin");

  const { data: profile } = await supabase.from("profiles").select("background_url").eq("user_id", user.id).maybeSingle();
  const { data: recent } = await supabase
    .from("checkins")
    .select("id, photo_url, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(6);

  // Ensure user profile exists
  const { client: syncClient } = createDrizzle();
  await syncClient.connect();
  try {
    // Check if profile exists
    const { rows: existingProfile } = await syncClient.query(
      `SELECT id FROM profiles WHERE user_id = $1`,
      [user.id]
    );

    if (existingProfile.length === 0) {
      // Generate a unique username
      const baseUsername = user.email?.split('@')[0] || 'user';
      let username = baseUsername;
      let counter = 1;

      // Check if username exists and increment if needed
      while (true) {
        const { rows: usernameCheck } = await syncClient.query(
          `SELECT id FROM profiles WHERE username = $1`,
          [username]
        );

        if (usernameCheck.length === 0) break;
        username = `${baseUsername}${counter}`;
        counter++;
      }

      // Create profile with username and user_id
      await syncClient.query(
        `INSERT INTO profiles (id, user_id, username, display_name) VALUES ($1, $2, $3, $4)`,
        [crypto.randomUUID(), user.id, username, user.email?.split('@')[0] || 'User']
      );
    }
  } catch (error) {
    console.error("Profile sync error:", error);
  } finally {
    await syncClient.end();
  }

  // Get social activity data
  const { client } = createDrizzle();
  await client.connect();

  try {
    // Get recent social feed items (2 most recent)
    const { rows: socialFeed } = await client.query(
      `SELECT
        c.id,
        c.photo_url,
        c.created_at,
        p.display_name
       FROM checkins c
       JOIN follows f ON c.user_id = f.following_id
       LEFT JOIN profiles p ON c.user_id = p.user_id
       WHERE f.follower_id = $1
       ORDER BY c.created_at DESC
       LIMIT 2`,
      [user.id]
    );

    // Get following count
    const { rows: followingCountRows } = await client.query(
      `SELECT COUNT(*)::int as count FROM follows WHERE follower_id = $1`,
      [user.id]
    );

    const followingCount = followingCountRows[0]?.count || 0;

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

        <section className="mx-auto max-w-2xl px-4 py-6 space-y-6">
          {/* Social Activity Preview */}
          {followingCount > 0 && (
            <Card className="overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                    <Heart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                    Social Activity
                  </CardTitle>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Following {followingCount} people
                  </p>
                </div>
                <Button asChild size="sm" className="rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
                  <Link href="/social" className="text-white">
                    View Feed
                  </Link>
                </Button>
              </CardHeader>
              {socialFeed.length > 0 && (
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    {socialFeed.map((item) => (
                      <div key={item.id} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200/50 dark:border-slate-600/50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.photo_url}
                          alt="Recent activity"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    <div className="flex-1 flex items-center text-sm text-slate-600 dark:text-slate-400">
                      Recent check-ins from people you follow
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Discover People CTA */}
          {followingCount === 0 && (
            <Card className="overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 shadow-lg">
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-medium mb-2 text-slate-800 dark:text-slate-100">Discover People</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Find and follow other users to see their check-ins in your social feed!
                </p>
                <Button asChild className="rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
                  <Link href="/social/discover" className="flex items-center gap-2 text-white">
                    <UserPlus className="h-4 w-4" />
                    Find People
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Recent Check-ins */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100">Recent Check-ins</h2>
              <Link href="/history" className="text-sm text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300">
                View all
              </Link>
            </div>
            {recent && recent.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {recent.map((c) => (
                  <Link
                    key={c.id}
                    href={`/history/${c.id}`}
                    className="group relative block aspect-square overflow-hidden rounded-lg border border-slate-200/50 dark:border-slate-600/50 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.photo_url}
                      alt="Check-in"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute bottom-0 w-full bg-black/60 p-1 text-[11px] text-white">
                      {formatVietnamDateTime(c.created_at)}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-slate-600 dark:text-slate-400">No check-ins yet.</p>
            )}
          </div>
        </section>
      </main>
    );
  } catch (error) {
    console.error("Dashboard error:", error);
    await client.end();
    return (
      <main className="min-h-dvh">
        <section className="relative h-56 w-full overflow-hidden rounded-b-xl">
          <div className="flex h-full w-full items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">No background</div>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-x-0 bottom-4 flex items-center justify-between px-4">
            <h1 className="text-xl font-semibold text-white">Welcome</h1>
            <ChangeBackground />
          </div>
        </section>
        <section className="mx-auto max-w-2xl px-4 py-6">
          <p className="text-slate-600 dark:text-slate-400">Something went wrong. Please try again later.</p>
        </section>
      </main>
    );
  }
}

