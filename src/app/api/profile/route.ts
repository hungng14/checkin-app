import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDrizzle } from "@/config/database";

// GET - Get user's profile
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { client } = createDrizzle();
  await client.connect();
  
  try {
    const { rows } = await client.query(
      `SELECT id, user_id, username, display_name, background_url, updated_at
       FROM profiles
       WHERE user_id = $1`,
      [user.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const profile = {
      id: rows[0].id,
      userId: rows[0].user_id,
      username: rows[0].username,
      displayName: rows[0].display_name,
      backgroundUrl: rows[0].background_url,
      updatedAt: rows[0].updated_at,
    };

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await client.end();
  }
}
