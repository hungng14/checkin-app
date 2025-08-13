import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import SearchUsers from "@/components/SearchUsers";
import FollowingList from "@/components/FollowingList";
import UsernameDisplay from "@/components/UsernameDisplay";
import { FollowingProvider } from "@/contexts/FollowingContext";

export default async function DiscoverPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin");

  return (
    <FollowingProvider>
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="mx-auto max-w-2xl px-4 py-6">
          {/* Header Card */}
          <Card className="mb-6 overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Discover People
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Find and follow other users
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="outline" className="rounded-full bg-white/50 hover:bg-white/70 dark:bg-slate-700/50 dark:hover:bg-slate-700/70 border-slate-300 dark:border-slate-600">
                <Link href="/social" className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Feed
                </Link>
              </Button>
            </CardHeader>
          </Card>

          <div className="space-y-6">
            {/* Username Display */}
            <UsernameDisplay />

            {/* Search Section */}
            <Card className="overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg text-slate-800 dark:text-slate-100">Search Users</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Search for users by their username
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SearchUsers />
              </CardContent>
            </Card>

            {/* Following List */}
            <FollowingList type="following" title="People You Follow" />

            {/* Followers List */}
            <FollowingList type="followers" title="Your Followers" />
          </div>
        </div>
      </main>
    </FollowingProvider>
  );
}
