import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDrizzle } from "@/config/database";

const CHECKIN_WINDOW_MINUTES = 10;

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { client } = createDrizzle();
  await client.connect();
  try {
    const { rows } = await client.query(
      `select id, user_id, photo_url, created_at, location, device_info
       from checkins
       where user_id = $1
       order by created_at desc
       limit 30`,
      [user.id]
    );
    return NextResponse.json(rows);
  } finally {
    await client.end();
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { photoUrl, location, deviceInfo } = body as {
    photoUrl: string;
    location?: string | null;
    deviceInfo?: string | null;
  };
  if (!photoUrl) return NextResponse.json({ error: "photoUrl required" }, { status: 400 });

  const { client } = createDrizzle();
  await client.connect();
  try {
    const since = new Date(Date.now() - CHECKIN_WINDOW_MINUTES * 60 * 1000).toISOString();
    const recent = await client.query(
      `select id from checkins where user_id = $1 and created_at >= $2 order by created_at desc limit 1`,
      [user.id, since]
    );
    if (recent.rows.length > 0) {
      return NextResponse.json(
        { error: `Already checked in within the last ${CHECKIN_WINDOW_MINUTES} minutes` },
        { status: 429 }
      );
    }

    await client.query(
      `insert into checkins (user_id, photo_url, location, device_info) values ($1, $2, $3, $4)`,
      [user.id, photoUrl, location ?? null, deviceInfo ?? null]
    );
    return NextResponse.json({ ok: true });
  } finally {
    await client.end();
  }
}

