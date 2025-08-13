"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, RotateCcw, Loader2 } from "lucide-react";

const CHECKIN_WINDOW_MINUTES = 10;

export default function CameraCapture() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  // Check for multiple cameras on component mount
  useEffect(() => {
    async function checkCameras() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      } catch (error) {
        console.warn("Could not enumerate devices:", error);
      }
    }
    checkCameras();
  }, []);

  // Initialize camera stream
  useEffect(() => {
    async function initCamera() {
      setIsInitializing(true);
      try {
        // Stop existing stream
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }

        const constraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(newStream);

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
      } catch (error) {
        console.error("Camera initialization error:", error);
        toast.error("Camera access denied. Please allow camera permissions.");
      } finally {
        setIsInitializing(false);
      }
    }

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const switchCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

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
    <div className="flex flex-col gap-6">
      {/* Camera Preview */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-white/20 shadow-xl bg-black">
        <div className="aspect-[4/3] relative">
          {isInitializing ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="flex flex-col items-center gap-3 text-white">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Initializing camera...</p>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Camera overlay with face guide */}
              <div className="pointer-events-none absolute inset-0">
                {/* Face guide circle */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 rounded-full border-2 border-white/40 border-dashed animate-pulse" />
                </div>

                {/* Gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

                {/* Camera switch button */}
                {hasMultipleCameras && (
                  <button
                    onClick={switchCamera}
                    disabled={isSubmitting || isInitializing}
                    className="absolute top-4 right-4 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors disabled:opacity-50 backdrop-blur-sm"
                    aria-label={`Switch to ${facingMode === "user" ? "back" : "front"} camera`}
                  >
                    <RotateCcw className="h-5 w-5" />
                  </button>
                )}

                {/* Camera mode indicator */}
                <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/50 text-white text-xs backdrop-blur-sm">
                  {facingMode === "user" ? "Front Camera" : "Back Camera"}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Enhanced Capture Button */}
      <div className="space-y-3">
        <Button
          onClick={capture}
          disabled={isSubmitting || isInitializing}
          className="w-full h-16 rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Saving Check-In...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Camera className="h-6 w-6" />
              <span>Capture & Check-In</span>
            </div>
          )}
        </Button>

        {/* Helper text */}
        <p className="text-center text-sm text-muted-foreground">
          Position your face in the circle and tap the button
        </p>
      </div>
    </div>
  );
}

