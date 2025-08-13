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
  const targetUserId = searchParams.get("userId");
  
  if (!targetUserId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const { client } = createDrizzle();
  await client.connect();
  
  try {
    // Check if current user follows target user
    const { rows: followingRows } = await client.query(
      `SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [user.id, targetUserId]
    );

    // Check if target user follows current user
    const { rows: followerRows } = await client.query(
      `SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [targetUserId, user.id]
    );

    // Get follow counts for target user
    const { rows: followingCountRows } = await client.query(
      `SELECT COUNT(*)::int as count FROM follows WHERE follower_id = $1`,
      [targetUserId]
    );

    const { rows: followersCountRows } = await client.query(
      `SELECT COUNT(*)::int as count FROM follows WHERE following_id = $1`,
      [targetUserId]
    );

    return NextResponse.json({
      isFollowing: followingRows.length > 0,
      isFollowedBy: followerRows.length > 0,
      followingCount: followingCountRows[0]?.count || 0,
      followersCount: followersCountRows[0]?.count || 0,
    });
  } catch (error) {
    console.error("Follow status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await client.end();
  }
}
