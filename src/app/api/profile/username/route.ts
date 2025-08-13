import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDrizzle } from "@/config/database";

// PUT - Update user's username
export async function PUT(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { username } = body as { username: string };
  
  if (!username || username.trim().length < 2) {
    return NextResponse.json({ error: "Username must be at least 2 characters" }, { status: 400 });
  }

  // Validate username format (alphanumeric and underscores only)
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username.trim())) {
    return NextResponse.json({ error: "Username can only contain letters, numbers, and underscores" }, { status: 400 });
  }

  const { client } = createDrizzle();
  await client.connect();
  
  try {
    // Check if username is already taken by another user
    const { rows: existingUser } = await client.query(
      `SELECT user_id FROM profiles WHERE username = $1 AND user_id != $2`,
      [username.trim(), user.id]
    );

    if (existingUser.length > 0) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }

    // Update the username
    const { rows } = await client.query(
      `UPDATE profiles 
       SET username = $1, updated_at = NOW() 
       WHERE user_id = $2 
       RETURNING username`,
      [username.trim(), user.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      username: rows[0].username 
    });
  } catch (error) {
    console.error("Update username error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await client.end();
  }
}
