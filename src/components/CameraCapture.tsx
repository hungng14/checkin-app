"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const CHECKIN_WINDOW_MINUTES = 10;

export default function CameraCapture() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function init() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch {
        toast.error("Camera access denied. Please allow camera permissions.");
      }
    }
    init();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function capture() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9));
    if (!blob) return;

    setIsSubmitting(true);
    try {
      // Get user
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("Not authenticated");

      // Prevent duplicate check-in within window
      const since = new Date(Date.now() - CHECKIN_WINDOW_MINUTES * 60 * 1000).toISOString();
      const { data: recent, error: recentErr } = await supabase
        .from("checkins")
        .select("id, created_at")
        .eq("user_id", user.id)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1);
      if (recentErr) throw recentErr;
      if (recent && recent.length > 0) {
        toast.info(`You already checked in within ${CHECKIN_WINDOW_MINUTES} minutes.`);
        setIsSubmitting(false);
        return;
      }

      // Geolocation (optional)
      const location = await new Promise<string | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(`${pos.coords.latitude},${pos.coords.longitude}`),
          () => resolve(null),
          { enableHighAccuracy: false, timeout: 5000 }
        );
      });

      const deviceInfo = typeof navigator !== "undefined" ? navigator.userAgent : null;

      // Request signed upload URL from backend to avoid exposing path logic
      const res = await fetch("/api/upload-url", { method: "POST" });
      if (!res.ok) throw new Error("Failed to get upload URL");
      const { url, path } = (await res.json()) as { url: string; path: string };

      // Upload blob directly to signed URL
      const uploadRes = await fetch(url, { method: "PUT", body: blob, headers: { "Content-Type": "image/jpeg" } });
      if (!uploadRes.ok) throw new Error("Upload failed");

      const { data: pub } = supabase.storage.from("checkin-photos").getPublicUrl(path);
      const photoUrl = pub.publicUrl;

      // Create check-in via backend (Drizzle + DATABASE_URL)
      const post = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl, location, deviceInfo }),
      });
      if (!post.ok) {
        const j = await post.json().catch(() => ({}));
        throw new Error(j.error || "Check-in failed");
      }

      toast.success("Check-in saved! Redirecting to history...");
      router.push("/history");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Check-in failed";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-xl border shadow-sm">
        <video ref={videoRef} autoPlay playsInline className="w-full bg-black" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <Button onClick={capture} disabled={isSubmitting} className="w-full h-11 rounded-full">
        {isSubmitting ? "Saving..." : "Capture & Check-In"}
      </Button>
    </div>
  );
}

