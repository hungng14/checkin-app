import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDrizzle } from "@/config/database";
/* simple page; no heavy animations to keep it snappy */

export default async function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin");

  const { client } = createDrizzle();
  await client.connect();
  const { rows } = await client.query(
    `select id, photo_url, created_at, location, device_info from checkins where id = $1 and user_id = $2 limit 1`,
    [id, user.id]
  );
  await client.end();
  const data = rows[0];
  if (!data) return notFound();

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <div className="aspect-square overflow-hidden rounded-xl animate-in fade-in-0 duration-300">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={data.photo_url} alt="Checkin" className="h-full w-full object-cover" />
      </div>
      <div className="mt-4 space-y-3">
        <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
          <div className="text-sm text-muted-foreground">Timestamp</div>
          <div className="font-medium">{new Date(data.created_at).toLocaleString()}</div>
        </div>
        {data.location && (
          <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
            <div className="text-sm text-muted-foreground">Location</div>
            <div className="font-medium">{data.location}</div>
          </div>
        )}
        {data.device_info && (
          <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
            <div className="text-sm text-muted-foreground">Device</div>
            <div className="break-words font-medium">{data.device_info}</div>
          </div>
        )}
      </div>
    </main>
  );
}

