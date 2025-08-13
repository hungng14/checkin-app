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
  const username = searchParams.get("username");

  if (!username || username.length < 2) {
    return NextResponse.json({ error: "Username query must be at least 2 characters" }, { status: 400 });
  }

  const { client } = createDrizzle();
  await client.connect();

  try {
    // Search for users by username (case-insensitive partial match)
    const { rows } = await client.query(
      `SELECT id, user_id, username, display_name
       FROM profiles
       WHERE LOWER(username) LIKE LOWER($1)
       AND user_id != $2
       ORDER BY username
       LIMIT 20`,
      [`%${username}%`, user.id]
    );

    const users = rows.map(row => ({
      id: row.user_id, // Return the auth user ID for following
      username: row.username,
      displayName: row.display_name || row.username,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await client.end();
  }
}
