"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, RotateCcw, Loader2, AlertCircle } from "lucide-react";

const CHECKIN_WINDOW_MINUTES = 10;

export default function CameraCapture() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  // Enhanced camera error handling
  const handleCameraError = useCallback((error: any) => {
    console.error("Camera error:", error);
    setCameraError(null); // Clear any previous errors

    switch (error.name) {
      case "NotAllowedError":
        setCameraError("Camera access denied. Please allow camera permissions and refresh the page.");
        toast.error("Camera access denied. Please allow camera permissions.");
        break;
      case "NotFoundError":
        setCameraError("No camera found on this device.");
        toast.error("No camera found on this device.");
        break;
      case "NotSupportedError":
        setCameraError("Camera not supported in this browser.");
        toast.error("Camera not supported in this browser.");
        break;
      case "NotReadableError":
        setCameraError("Camera is already in use by another application.");
        toast.error("Camera is already in use by another application.");
        break;
      case "OverconstrainedError":
        setCameraError("Camera constraints cannot be satisfied.");
        toast.error("Camera constraints cannot be satisfied.");
        break;
      default:
        setCameraError("Failed to access camera. Please try again.");
        toast.error("Failed to access camera. Please try again.");
    }
  }, []);

  // Check for available cameras and enumerate devices
  useEffect(() => {
    async function checkCameras() {
      try {
        // Request permission first to get device labels
        await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        setAvailableDevices(videoDevices);
        setHasMultipleCameras(videoDevices.length > 1);

        // Set initial device ID if available
        if (videoDevices.length > 0 && !currentDeviceId) {
          // Try to find front camera first
          const frontCamera = videoDevices.find(device =>
            device.label.toLowerCase().includes('front') ||
            device.label.toLowerCase().includes('user')
          );
          setCurrentDeviceId(frontCamera?.deviceId || videoDevices[0].deviceId);
        }
      } catch (error) {
        console.warn("Could not enumerate devices:", error);
        handleCameraError(error);
      }
    }
    checkCameras();
  }, [handleCameraError, currentDeviceId]);

  // Initialize camera stream with improved constraints
  useEffect(() => {
    async function initCamera() {
      setIsInitializing(true);
      setCameraError(null);

      try {
        // Stop existing stream
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }

        // Build constraints with better mobile support
        const constraints: MediaStreamConstraints = {
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 60 }
          },
          audio: false
        };

        // Use deviceId if available, otherwise use facingMode
        if (currentDeviceId) {
          (constraints.video as MediaTrackConstraints).deviceId = { exact: currentDeviceId };
        } else {
          (constraints.video as MediaTrackConstraints).facingMode = facingMode;
        }

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(newStream);

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;

          // Ensure video plays on mobile
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(console.error);
          };
        }
      } catch (error) {
        handleCameraError(error);
      } finally {
        setIsInitializing(false);
      }
    }

    // Only initialize if we have device info or it's the first load
    if (availableDevices.length > 0 || currentDeviceId === null) {
      initCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode, currentDeviceId, availableDevices.length, handleCameraError]);

  // Enhanced camera switching with device-specific support
  const switchCamera = useCallback(() => {
    if (availableDevices.length > 1) {
      // Find current device index
      const currentIndex = availableDevices.findIndex(device => device.deviceId === currentDeviceId);

      // Switch to next device, or first if at end
      const nextIndex = (currentIndex + 1) % availableDevices.length;
      const nextDevice = availableDevices[nextIndex];

      setCurrentDeviceId(nextDevice.deviceId);

      // Also update facing mode for fallback
      setFacingMode(prev => prev === "user" ? "environment" : "user");
    } else {
      // Fallback to facing mode switching
      setFacingMode(prev => prev === "user" ? "environment" : "user");
    }
  }, [availableDevices, currentDeviceId]);

  // Retry camera initialization
  const retryCamera = useCallback(() => {
    setCameraError(null);
    setIsInitializing(true);

    // Reset device selection and try again
    setCurrentDeviceId(null);
    setFacingMode("user");
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
    <div className="flex flex-col gap-6">
      {/* Camera Preview */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-white/20 shadow-xl bg-black">
        <div className="aspect-[4/3] relative">
          {cameraError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="flex flex-col items-center gap-4 text-white p-6 text-center">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <div>
                  <p className="text-sm font-medium mb-2">Camera Error</p>
                  <p className="text-xs text-gray-300 mb-4">{cameraError}</p>
                  <Button
                    onClick={retryCamera}
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          ) : isInitializing ? (
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

                {/* Camera switch button - show if multiple cameras OR if we have devices */}
                {(hasMultipleCameras || availableDevices.length > 1) && (
                  <button
                    onClick={switchCamera}
                    disabled={isSubmitting || isInitializing}
                    className="absolute top-4 right-4 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors disabled:opacity-50 backdrop-blur-sm pointer-events-auto"
                    aria-label={`Switch camera (${availableDevices.length} available)`}
                  >
                    <RotateCcw className="h-5 w-5" />
                  </button>
                )}

                {/* Camera mode indicator */}
                <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/50 text-white text-xs backdrop-blur-sm">
                  {currentDeviceId ?
                    availableDevices.find(d => d.deviceId === currentDeviceId)?.label?.split('(')[0]?.trim() ||
                    (facingMode === "user" ? "Front Camera" : "Back Camera")
                    : (facingMode === "user" ? "Front Camera" : "Back Camera")
                  }
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
          disabled={isSubmitting || isInitializing || !!cameraError}
          className="w-full h-16 rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Saving Check-In...</span>
            </div>
          ) : cameraError ? (
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6" />
              <span>Camera Unavailable</span>
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
          {cameraError
            ? "Fix camera issues above to continue"
            : "Position your face in the circle and tap the button"
          }
        </p>

        {/* Debug info for development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>Devices: {availableDevices.length}</p>
            <p>Current: {currentDeviceId ? 'Device ID' : facingMode}</p>
            <p>Multiple: {hasMultipleCameras ? 'Yes' : 'No'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

