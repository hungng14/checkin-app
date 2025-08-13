"use client";

import { useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function ChangeBackground() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  async function onPick() {
    inputRef.current?.click();
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("Not authenticated");

      // Generate a unique filename
      const randomStr = Math.random().toString(36).substring(2, 15);
      const timestamp = Date.now();
      const uniqueFilename = `${randomStr}-${timestamp}-bg.jpg`;
      const path = `backgrounds/${user.id}/${uniqueFilename}`;

      const { error: uploadErr } = await supabase.storage.from("checkin-photos").upload(path, file, {
        contentType: file.type || "image/jpeg",
      });

      if (uploadErr) throw uploadErr;
      const { data: pub } = supabase.storage.from("checkin-photos").getPublicUrl(path);

      // First check if profile exists, then update or insert accordingly
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingProfile) {
        // Profile exists, update it
        const { error: updateErr } = await supabase
          .from("profiles")
          .update({ background_url: pub.publicUrl })
          .eq("user_id", user.id);

        if (updateErr) {
          console.error("Update error:", updateErr);
          throw updateErr;
        }
      } else {
        // Profile doesn't exist, create it
        console.log("Creating new profile for user:", user.id);
        const baseUsername = user.email?.split('@')[0] || 'user';
        const timestamp = Date.now().toString().slice(-4);
        const username = `${baseUsername}_${timestamp}`;

        const { error: insertErr } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            background_url: pub.publicUrl,
            username: username,
            display_name: user.email?.split('@')[0] || 'User'
          });

        if (insertErr) {
          console.error("Insert error:", insertErr);
          throw insertErr;
        }
      }

      router.refresh();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to update background";
      alert(message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onChange} />
      <Button onClick={onPick} disabled={isUploading} variant="secondary">
        {isUploading ? "Uploading..." : "Change Background"}
      </Button>
    </div>
  );
}

