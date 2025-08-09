import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDrizzle } from "@/config/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, Camera } from "lucide-react";

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
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Card className="mb-4 overflow-hidden bg-[linear-gradient(to_bottom,_#f7d488_0%,_#fbfbea_22%,_#e7f7ee_38%,_#a8d5c8_60%,_#2a4a5e_86%,_#193043_100%)] shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" /> History
            </CardTitle>
            <CardDescription>Your recent check-ins</CardDescription>
          </div>
          <Button asChild size="sm" className="rounded-full">
            <Link href="/dashboard/checkin" className="flex items-center gap-1">
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
                  className="group relative block aspect-square overflow-hidden rounded-md border bg-muted/30 animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.photo_url}
                    alt="Checkin"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/60 to-transparent p-1 text-[11px] text-white">
                    {new Date(c.created_at).toLocaleString()}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-muted-foreground">
              <div className="rounded-full border p-4">
                <CalendarClock className="h-6 w-6" />
              </div>
              <p>No check-ins yet.</p>
              <Button asChild className="rounded-full">
                <Link href="/dashboard/checkin" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" /> Make your first check-in
                </Link>
              </Button>
            </div>
          )}
          {items && items.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              {hasPrev ? (
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link href={`/history?page=${page - 1}`}>Previous</Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="rounded-full" disabled>
                  Previous
                </Button>
              )}
              <div className="text-sm text-muted-foreground">
                Page {page}{totalPages > 0 ? ` of ${totalPages}` : ""}
              </div>
              {hasNext ? (
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link href={`/history?page=${page + 1}`}>Next</Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="rounded-full" disabled>
                  Next
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

