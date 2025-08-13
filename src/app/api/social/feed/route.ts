import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDrizzle } from "@/config/database";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  const { client } = createDrizzle();
  await client.connect();
  
  try {
    // Get check-ins from users that the current user follows
    const { rows } = await client.query(
      `SELECT 
        c.id,
        c.photo_url,
        c.created_at,
        c.location,
        c.device_info,
        c.user_id,
        p.email,
        p.display_name
       FROM checkins c
       JOIN follows f ON c.user_id = f.following_id
       JOIN profiles p ON c.user_id = p.id
       WHERE f.follower_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [user.id, limit, offset]
    );

    // Get total count for pagination
    const { rows: countRows } = await client.query(
      `SELECT COUNT(*)::int as total
       FROM checkins c
       JOIN follows f ON c.user_id = f.following_id
       WHERE f.follower_id = $1`,
      [user.id]
    );

    const total = countRows[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const checkins = rows.map(row => ({
      id: row.id,
      photoUrl: row.photo_url,
      createdAt: row.created_at,
      location: row.location,
      deviceInfo: row.device_info,
      user: {
        id: row.user_id,
        email: row.email,
        displayName: row.display_name || row.email?.split('@')[0] || 'Unknown User',
      },
    }));

    return NextResponse.json({
      checkins,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Social feed error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await client.end();
  }
}
