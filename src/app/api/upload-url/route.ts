import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const path = `checkins/${user.id}/${Date.now()}.jpg`;
  const { data, error } = await supabase.storage.from("checkin-photos").createSignedUploadUrl(path);
  console.log(data, error);
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 500 });
  return NextResponse.json({ path, token: data.token, url: data.signedUrl });
}

