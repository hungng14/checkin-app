import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDrizzle } from "@/config/database";

// GET - Get reactions for a checkin or user's reactions
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const checkinId = searchParams.get("checkinId");
  const userId = searchParams.get("userId");

  const { client } = createDrizzle();
  await client.connect();
  
  try {
    if (checkinId) {
      // Get reactions for a specific checkin with counts
      const { rows: reactions } = await client.query(`
        SELECT
          reaction_type,
          COUNT(*) as count,
          BOOL_OR(user_id = $1) as user_reacted
        FROM reactions
        WHERE checkin_id = $2
        GROUP BY reaction_type
      `, [user.id, checkinId]);

      // Get user's specific reactions for this checkin (can be multiple)
      const { rows: userReactions } = await client.query(`
        SELECT reaction_type
        FROM reactions
        WHERE user_id = $1 AND checkin_id = $2
      `, [user.id, checkinId]);

      return NextResponse.json({
        reactions: reactions.map(r => ({
          type: r.reaction_type,
          count: parseInt(r.count),
          userReacted: r.user_reacted
        })),
        userReactions: userReactions.map(r => r.reaction_type)
      });
    } else if (userId) {
      // Get all reactions by a specific user
      const { rows: userReactions } = await client.query(`
        SELECT r.*, c.photo_url, c.created_at as checkin_created_at
        FROM reactions r
        JOIN checkins c ON r.checkin_id = c.id
        WHERE r.user_id = $1
        ORDER BY r.created_at DESC
      `, [userId]);

      return NextResponse.json({ reactions: userReactions });
    } else {
      return NextResponse.json({ error: "checkinId or userId is required" }, { status: 400 });
    }
  } catch (error) {
    console.error("Get reactions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await client.end();
  }
}

// POST - Add a reaction (allows multiple reactions per user)
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { checkinId, reactionType } = body as { checkinId: string; reactionType: string };

  if (!checkinId || !reactionType) {
    return NextResponse.json({ error: "checkinId and reactionType are required" }, { status: 400 });
  }

  if (!['haha', 'heart', 'wow'].includes(reactionType)) {
    return NextResponse.json({ error: "Invalid reaction type" }, { status: 400 });
  }

  const { client } = createDrizzle();
  await client.connect();

  try {
    // Check if user already has this specific reaction type for this checkin
    const { rows: existing } = await client.query(
      `SELECT id FROM reactions WHERE user_id = $1 AND checkin_id = $2 AND reaction_type = $3`,
      [user.id, checkinId, reactionType]
    );

    if (existing.length > 0) {
      // User already has this reaction type, return success (idempotent)
      return NextResponse.json({ success: true, message: "Reaction already exists" });
    } else {
      // Create new reaction
      await client.query(
        `INSERT INTO reactions (user_id, checkin_id, reaction_type) VALUES ($1, $2, $3)`,
        [user.id, checkinId, reactionType]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Add reaction error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await client.end();
  }
}

// DELETE - Remove a specific reaction type
export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const checkinId = searchParams.get("checkinId");
  const reactionType = searchParams.get("reactionType");

  if (!checkinId) {
    return NextResponse.json({ error: "checkinId is required" }, { status: 400 });
  }

  const { client } = createDrizzle();
  await client.connect();

  try {
    if (reactionType) {
      // Remove specific reaction type
      await client.query(
        `DELETE FROM reactions WHERE user_id = $1 AND checkin_id = $2 AND reaction_type = $3`,
        [user.id, checkinId, reactionType]
      );
    } else {
      // Remove all reactions for this checkin (fallback)
      await client.query(
        `DELETE FROM reactions WHERE user_id = $1 AND checkin_id = $2`,
        [user.id, checkinId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete reaction error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await client.end();
  }
}
