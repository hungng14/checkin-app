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

      const path = `backgrounds/${user.id}/bg.jpg`;
      const { error: uploadErr } = await supabase.storage.from("checkin-photos").upload(path, file, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });
      if (uploadErr) throw uploadErr;
      const { data: pub } = supabase.storage.from("checkin-photos").getPublicUrl(path);

      const { error: upErr } = await supabase
        .from("profiles")
        .upsert({ id: user.id, background_url: pub.publicUrl }, { onConflict: "id" });
      if (upErr) throw upErr;

      router.refresh();
    } catch (e: unknown) {
      // eslint-disable-next-line no-alert
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

