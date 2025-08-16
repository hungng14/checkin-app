'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Camera, RefreshCcw, Loader2, RotateCcw } from 'lucide-react';
const CHECKIN_WINDOW_MINUTES = 10;
// Cross‑device camera with iOS handling and front/back switching
export default function CameraCapture() {
  const supabase = useMemo(createSupabaseBrowserClient, []);
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStarting, setIsStarting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [canSwitch, setCanSwitch] = useState(false);
  const [phase, setPhase] = useState<
    'idle' | 'capturing' | 'uploading' | 'saving' | 'done'
  >('idle');

  const isIOS = useMemo(
    () =>
      typeof navigator !== 'undefined' &&
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream,
    []
  );

  useEffect(() => {
    return () => stopStream();
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function initCamera(requested: 'user' | 'environment') {
    setError(null);
    setIsStarting(true);
    try {
      stopStream();

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: requested },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      let stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Fallbacks for iOS if back camera is black/unsupported
      if (!stream && isIOS && requested === 'environment') {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        setFacingMode('user');
      }

      streamRef.current = stream;
      if (videoRef.current) {
        const v = videoRef.current;
        if (isIOS) {
          v.setAttribute('playsinline', 'true');
          v.setAttribute('webkit-playsinline', 'true');
          v.muted = true;
        }
        v.srcObject = stream;
        const tryPlay = () =>
          v.play().catch(() => setTimeout(() => v.play().catch(() => {}), 200));
        v.onloadedmetadata = tryPlay;
        v.oncanplay = tryPlay;
      }

      // Determine if multiple cameras are available (can switch)
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setCanSwitch(videoInputs.length > 1);
      } catch {}

      setIsReady(true);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Camera failed to start');
      setIsReady(false);
    } finally {
      setIsStarting(false);
    }
  }

  function switchCamera() {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    initCamera(next);
  }

  async function captureFrame() {
    if (!videoRef.current || !canvasRef.current) return;
    setPhase('capturing');
    try {
      const v = videoRef.current;
      const c = canvasRef.current;
      c.width = v.videoWidth || 1280;
      c.height = v.videoHeight || 720;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, c.width, c.height);
      const blob: Blob | null = await new Promise((resolve) =>
        c.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
      );
      if (!blob) return;
      await submit(blob);
    } catch (err: any) {
      toast.error(err?.message || 'Capture failed');
      setPhase('idle');
    }
  }

  async function submit(blob?: Blob) {
    const useBlob = blob;
    if (!useBlob) return;
    setIsSubmitting(true);
    setPhase('uploading');
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authenticated');

      // Prevent duplicate check-in within window (best-effort; server still enforces)
      try {
        const since = new Date(
          Date.now() - CHECKIN_WINDOW_MINUTES * 60 * 1000
        ).toISOString();
        const { data: recent, error: recentErr } = await supabase
          .from('checkins')
          .select('id, created_at')
          .eq('user_id', auth.user.id)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(1);
        if (!recentErr && recent && recent.length > 0) {
          toast.info(
            `You already checked in within ${CHECKIN_WINDOW_MINUTES} minutes.`
          );
          setPhase('idle');
          setIsSubmitting(false);
          return;
        }
      } catch {
        // Ignore client check errors; rely on server 429
      }

      const location = await new Promise<string | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(`${pos.coords.latitude},${pos.coords.longitude}`),
          () => resolve(null),
          { enableHighAccuracy: false, timeout: 5000 }
        );
      });
      const deviceInfo =
        typeof navigator !== 'undefined' ? navigator.userAgent : null;

      const res = await fetch('/api/upload-url', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to get upload URL');
      const { url, path } = (await res.json()) as { url: string; path: string };

      const up = await fetch(url, {
        method: 'PUT',
        body: useBlob,
        headers: { 'Content-Type': 'image/jpeg' },
      });
      if (!up.ok) throw new Error('Upload failed');

      setPhase('saving');
      const { data: pub } = supabase.storage
        .from('checkin-photos')
        .getPublicUrl(path);
      const photoUrl = pub.publicUrl;

      const post = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl, location, deviceInfo }),
      });
      if (!post.ok) {
        const j = await post.json().catch(() => ({}));
        throw new Error((j as any).error || 'Check-in failed');
      }

      setPhase('done');
      toast.success('Check-in saved! Redirecting to history...');
      router.push('/history');
    } catch (e: any) {
      toast.error(e?.message || 'Check-in failed');
      setPhase('idle');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isSubmittingAPI = phase === 'capturing' || isSubmitting;

  return (
    <div className='relative w-full'>
      {/* Live preview container */}
      <div className='relative aspect-[3/4] overflow-hidden rounded-2xl bg-black shadow-xl'>
        {/* video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className='h-full w-full object-cover'
        />

        {/* gradient mask */}
        <div className='pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40' />

        {/* center guide */}
        <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
          <div className='h-48 w-48 rounded-full border-2 border-white/30' />
        </div>

        {/* overlays */}
        {error && (
          <div className='absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-white'>
            <p className='text-sm opacity-90'>{error}</p>
            <Button
              onClick={() => initCamera(facingMode)}
              className='bg-white/10 border border-white/20'
            >
              Try again
            </Button>
          </div>
        )}
        {isStarting && (
          <div className='absolute inset-0 grid place-items-center bg-black/70 text-white'>
            <div className='flex items-center gap-2'>
              <Loader2 className='h-5 w-5 animate-spin' /> Initializing camera…
            </div>
          </div>
        )}
        {!isReady && !isStarting && !error && (
          <div className='absolute inset-0 grid place-items-center bg-black/70 text-white'>
            <Button
              onClick={() => initCamera(facingMode)}
              className='gap-2 bg-white text-slate-900 hover:bg-slate-100'
            >
              <Camera className='h-4 w-4' /> Enable Camera
            </Button>
          </div>
        )}
      </div>

      {/* controls */}
      <div className='mt-4 flex items-center justify-between'>
        <Button
          onClick={() => initCamera(facingMode)}
          variant='outline'
          className='gap-2'
        >
          <RotateCcw className='h-4 w-4' /> Restart
        </Button>
        <div className='flex items-center gap-3'>
          {canSwitch && isReady && (
            <Button
              onClick={switchCamera}
              variant='outline'
              className='rounded-full gap-2'
            >
              <RefreshCcw className='h-4 w-4' />{' '}
              {facingMode === 'user' ? 'Back' : 'Front'}
            </Button>
          )}
          <Button
            onClick={captureFrame}
            disabled={!isReady || isSubmittingAPI}
            className='rounded-full bg-blue-600 text-white hover:bg-blue-700'
          >
            <span className='flex items-center gap-2'>
              <Camera className='h-4 w-4' />{' '}
              {isSubmittingAPI ? 'Submitting...' : 'Capture'}
            </span>
          </Button>
        </div>
      </div>

      {/* hidden canvas */}
      <canvas ref={canvasRef} className='hidden' />
    </div>
  );
}
