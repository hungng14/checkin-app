import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Users, UserPlus } from "lucide-react";
import Link from "next/link";
import { formatVietnamDateTime } from "@/lib/utils";
import { createDrizzle } from "@/config/database";
import ReactionButton from "@/components/ReactionButton";

interface ReactionData {
  type: string;
  count: number;
  userReacted: boolean;
}

interface SocialCheckin {
  id: string;
  photoUrl: string;
  createdAt: string;
  location?: string;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
  reactions: ReactionData[];
  userReactions: string[];
}

export default async function SocialPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin");

  const resolvedSearchParams = (await searchParams) ?? {};
  const page = typeof resolvedSearchParams.page === "string" ? parseInt(resolvedSearchParams.page, 10) : 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const { client } = createDrizzle();
  await client.connect();

  try {
    // Get social feed first (optimized)
    const { rows: checkins } = await client.query(
      `SELECT
        c.id,
        c.photo_url,
        c.created_at,
        c.location,
        c.user_id,
        p.display_name
       FROM checkins c
       JOIN follows f ON c.user_id = f.following_id
       LEFT JOIN profiles p ON c.user_id = p.id
       WHERE f.follower_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [user.id, limit, offset]
    );

    // Get all reactions for these checkins in one query
    const checkinIds = checkins.map(c => c.id);
    let reactionsData = [];
    let userReactionsData = [];

    if (checkinIds.length > 0) {
      // Get reaction counts and user reaction status
      const { rows: reactions } = await client.query(
        `SELECT
          checkin_id,
          reaction_type,
          COUNT(*) as count,
          BOOL_OR(user_id = $1) as user_reacted
         FROM reactions
         WHERE checkin_id = ANY($2)
         GROUP BY checkin_id, reaction_type`,
        [user.id, checkinIds]
      );
      reactionsData = reactions;

      // Get user's specific reactions
      const { rows: userReactions } = await client.query(
        `SELECT checkin_id, reaction_type
         FROM reactions
         WHERE user_id = $1 AND checkin_id = ANY($2)`,
        [user.id, checkinIds]
      );
      userReactionsData = userReactions;
    }

    // Get total count
    const { rows: countRows } = await client.query(
      `SELECT COUNT(*)::int as total
       FROM checkins c
       JOIN follows f ON c.user_id = f.following_id
       WHERE f.follower_id = $1`,
      [user.id]
    );

    // Get following count
    const { rows: followingCountRows } = await client.query(
      `SELECT COUNT(*)::int as count FROM follows WHERE follower_id = $1`,
      [user.id]
    );

    const total = countRows[0]?.total || 0;
    const followingCount = followingCountRows[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;




    const socialCheckins: SocialCheckin[] = checkins.map(row => {
      // Get reactions for this checkin
      const checkinReactions = reactionsData
        .filter(r => r.checkin_id === row.id)
        .map(r => ({
          type: r.reaction_type,
          count: parseInt(r.count),
          userReacted: r.user_reacted
        }));

      // Get user reactions for this checkin
      const checkinUserReactions = userReactionsData
        .filter(ur => ur.checkin_id === row.id)
        .map(ur => ur.reaction_type);

      return {
        id: row.id,
        photoUrl: row.photo_url,
        createdAt: row.created_at,
        location: row.location,
        user: {
          id: row.user_id,
          email: '', // Placeholder - will be populated when profiles have emails
          displayName: row.display_name || `User ${row.user_id.slice(0, 8)}`,
        },
        reactions: checkinReactions,
        userReactions: checkinUserReactions,
      };
    });



    await client.end();

    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <Card className="mb-6 overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <Heart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  Social Feed
                </CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Check-ins from {followingCount} people you follow
                </p>
              </div>
              <Button asChild size="sm" className="rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
                <Link href="/social/discover" className="flex items-center gap-1 text-white">
                  <UserPlus className="h-4 w-4" />
                  Discover
                </Link>
              </Button>
            </CardHeader>
          </Card>

          {socialCheckins.length > 0 ? (
            <div className="space-y-6">
              {socialCheckins.map((checkin, index) => (
                <Card
                  key={checkin.id}
                  className="overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm text-slate-800 dark:text-slate-100">{checkin.user.displayName}</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{checkin.user.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {formatVietnamDateTime(checkin.createdAt)}
                        </p>
                        {/* {checkin.location && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">📍 {checkin.location}</p>
                        )} */}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="relative aspect-square overflow-hidden rounded-lg mb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={checkin.photoUrl}
                        alt="Check-in"
                        className="h-full w-full object-cover transition-transform hover:scale-105"
                      />
                    </div>
                    <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400 pb-6">
                      <ReactionButton
                        checkinId={checkin.id}
                        initialReactions={checkin.reactions}
                        initialUserReactions={checkin.userReactions}
                        className="relative"
                      />
                      {/* <Button variant="ghost" size="sm" className="h-8 px-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        <span className="text-xs">Comment</span>
                      </Button> */}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  {hasPrev && (
                    <Button asChild variant="outline" size="sm" className="rounded-full bg-white/80 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600">
                      <Link href={`/social?page=${page - 1}`} className="text-slate-700 dark:text-slate-300">Previous</Link>
                    </Button>
                  )}
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Page {page} of {totalPages}
                  </span>
                  {hasNext && (
                    <Button asChild variant="outline" size="sm" className="rounded-full bg-white/80 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600">
                      <Link href={`/social?page=${page + 1}`} className="text-slate-700 dark:text-slate-300">Next</Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Card className="text-center py-12 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 shadow-lg">
              <CardContent>
                <Heart className="h-12 w-12 mx-auto mb-4 text-slate-400 dark:text-slate-500 opacity-50" />
                <h3 className="text-lg font-medium mb-2 text-slate-800 dark:text-slate-100">Your social feed is empty</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  {followingCount === 0
                    ? "Start following people to see their check-ins here!"
                    : "The people you follow haven't checked in recently."
                  }
                </p>
                <Button asChild className="rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
                  <Link href="/social/discover" className="flex items-center gap-2 text-white">
                    <UserPlus className="h-4 w-4" />
                    Discover People
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    );
  } catch (error) {
    console.error("Social page error:", error);
    await client.end();
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <Card className="text-center py-12 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 shadow-lg">
            <CardContent>
              <p className="text-slate-600 dark:text-slate-400">Something went wrong. Please try again later.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }
}
