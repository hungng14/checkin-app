import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDrizzle } from "@/config/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, Camera } from "lucide-react";
import { formatVietnamDateTime } from "@/lib/utils";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin");

  const PAGE_SIZE = 30;
  const resolvedSearchParams = (await searchParams) ?? {};
  const rawPage = typeof resolvedSearchParams.page === "string" ? parseInt(resolvedSearchParams.page, 10) : 1;
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const { client } = createDrizzle();
  await client.connect();
  const { rows: countRows } = await client.query(
    `select count(*)::int as total from checkins where user_id = $1`,
    [user.id]
  );
  const total = (countRows?.[0]?.total as number) ?? 0;
  const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 0;
  const page = totalPages > 0 ? Math.min(Math.max(1, requestedPage), totalPages) : 1;
  const offset = (page - 1) * PAGE_SIZE;

  const { rows: items } = await client.query(
    `select id, photo_url, created_at from checkins where user_id = $1 order by created_at desc limit $2 offset $3`,
    [user.id, PAGE_SIZE, offset]
  );
  await client.end();

  const hasPrev = page > 1;
  const hasNext = totalPages > 0 && page < totalPages;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Card className="mb-4 overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <CalendarClock className="h-5 w-5 text-blue-600 dark:text-blue-400" /> History
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">Your recent check-ins</CardDescription>
            </div>
            <Button asChild size="sm" className="rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
              <Link href="/checkin" className="flex items-center gap-1 text-white">
                <Camera className="h-4 w-4" />
                New
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {items && items.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {items.map((c) => (
                  <Link
                    key={c.id}
                    href={`/history/${c.id}`}
                    className="group relative block aspect-square overflow-hidden rounded-lg border border-slate-200/50 dark:border-slate-600/50 bg-slate-50/30 dark:bg-slate-700/30 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.photo_url}
                      alt="Checkin"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/70 to-transparent p-1 text-[11px] text-white">
                      {formatVietnamDateTime(c.created_at)}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-slate-600 dark:text-slate-400">
                <div className="rounded-full border border-slate-300 dark:border-slate-600 p-4">
                  <CalendarClock className="h-6 w-6" />
                </div>
                <p>No check-ins yet.</p>
                <Button asChild className="rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
                  <Link href="/checkin" className="flex items-center gap-2 text-white">
                    <Camera className="h-4 w-4" /> Make your first check-in
                  </Link>
                </Button>
              </div>
            )}
            {items && items.length > 0 && (
              <div className="mt-4 flex items-center justify-between">
                {hasPrev ? (
                  <Button asChild variant="outline" size="sm" className="rounded-full bg-white/80 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600">
                    <Link href={`/history?page=${page - 1}`} className="text-slate-700 dark:text-slate-300">Previous</Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="rounded-full bg-white/80 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600" disabled>
                    Previous
                  </Button>
                )}
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Page {page}{totalPages > 0 ? ` of ${totalPages}` : ""}
                </div>
                {hasNext ? (
                  <Button asChild variant="outline" size="sm" className="rounded-full bg-white/80 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600">
                    <Link href={`/history?page=${page + 1}`} className="text-slate-700 dark:text-slate-300">Next</Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="rounded-full bg-white/80 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600" disabled>
                    Next
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

