import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDrizzle } from "@/config/database";

// GET - Get user's following list or followers
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "following" or "followers"
  const userId = searchParams.get("userId") || user.id;

  const { client } = createDrizzle();
  await client.connect();
  
  try {
    let query: string;
    let params: string[];

    if (type === "followers") {
      // Get users who follow the specified user
      query = `
        SELECT f.follower_id as id, p.username, p.display_name, f.created_at
        FROM follows f
        LEFT JOIN profiles p ON f.follower_id = p.user_id
        WHERE f.following_id = $1
        ORDER BY f.created_at DESC
      `;
      params = [userId];
    } else {
      // Get users that the specified user follows (default)
      query = `
        SELECT f.following_id as id, p.username, p.display_name, f.created_at
        FROM follows f
        LEFT JOIN profiles p ON f.following_id = p.user_id
        WHERE f.follower_id = $1
        ORDER BY f.created_at DESC
      `;
      params = [userId];
    }

    const { rows } = await client.query(query, params);
    
    const results = rows.map(row => ({
      id: row.id,
      username: row.username || `user_${row.id.slice(0, 8)}`,
      displayName: row.display_name || row.username || `User ${row.id.slice(0, 8)}`,
      followedAt: row.created_at,
    }));

    return NextResponse.json({ users: results });
  } catch (error) {
    console.error("Get follows error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await client.end();
  }
}

// POST - Follow a user
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { followingId } = body as { followingId: string };
  
  if (!followingId) {
    return NextResponse.json({ error: "followingId is required" }, { status: 400 });
  }

  if (followingId === user.id) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const { client } = createDrizzle();
  await client.connect();
  
  try {
    // Check if already following
    const { rows: existing } = await client.query(
      `SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [user.id, followingId]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: "Already following this user" }, { status: 409 });
    }

    // Create follow relationship
    await client.query(
      `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)`,
      [user.id, followingId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Follow error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await client.end();
  }
}

// DELETE - Unfollow a user
export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const followingId = searchParams.get("followingId");
  
  if (!followingId) {
    return NextResponse.json({ error: "followingId is required" }, { status: 400 });
  }

  const { client } = createDrizzle();
  await client.connect();
  
  try {
    // Remove follow relationship
    const { rowCount } = await client.query(
      `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [user.id, followingId]
    );

    if (rowCount === 0) {
      return NextResponse.json({ error: "Follow relationship not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unfollow error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await client.end();
  }
}
