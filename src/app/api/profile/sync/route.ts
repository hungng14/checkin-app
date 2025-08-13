import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDrizzle } from "@/config/database";

// This endpoint syncs user profile data with auth data
export async function POST() {
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
    // Check if profile exists
    const { rows: existingProfile } = await client.query(
      `SELECT id, username FROM profiles WHERE user_id = $1`,
      [user.id]
    );

    if (existingProfile.length === 0) {
      // Generate a unique username
      const baseUsername = user.email?.split('@')[0] || 'user';
      let username = baseUsername;
      let counter = 1;

      // Check if username exists and increment if needed
      while (true) {
        const { rows: usernameCheck } = await client.query(
          `SELECT id FROM profiles WHERE username = $1`,
          [username]
        );

        if (usernameCheck.length === 0) break;
        username = `${baseUsername}${counter}`;
        counter++;
      }

      // Create profile with username and user_id
      await client.query(
        `INSERT INTO profiles (id, user_id, username, display_name) VALUES ($1, $2, $3, $4)`,
        [crypto.randomUUID(), user.id, username, user.email?.split('@')[0] || 'User']
      );
    } else {
      // Update profile display name if missing
      await client.query(
        `UPDATE profiles SET display_name = COALESCE(display_name, $2) WHERE user_id = $1`,
        [user.id, user.email?.split('@')[0] || 'User']
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await client.end();
  }
}
