# Check-In Processing Documentation

This document describes the complete check-in flow in the Check-In App, from camera capture to data storage, including photo upload, duplicate prevention, and metadata collection.

## Overview

The check-in process is the core feature of the app, allowing users to capture daily wellness photos with associated metadata. The flow is designed to be mobile-first, secure, and user-friendly.

## Check-In Flow Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Camera UI     │    │  Photo Upload   │    │  Check-In API   │    │   Database      │
│                 │    │                 │    │                 │    │                 │
│ - Camera Access │───▶│ - Signed URL    │───▶│ - Duplicate     │───▶│ - Store Record │
│ - Photo Capture │    │ - Direct Upload │    │   Prevention    │    │ - User History  │
│ - Preview/Edit  │    │ - Public URL    │    │ - Metadata      │    │ - Timestamps    │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Step-by-Step Process

### 1. Camera Access and Capture

**Location**: `/src/components/CameraCapture.tsx`

#### Camera Initialization

```typescript
const startCamera = useCallback(async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user", // Front-facing camera
        width: { ideal: 1080 },
        height: { ideal: 1080 }
      }
    });
    
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      setStream(stream);
      setError(null);
    }
  } catch (err) {
    setError("Camera access denied or not available");
  }
}, []);
```

#### Photo Capture Process

```typescript
const capturePhoto = useCallback(() => {
  if (!videoRef.current || !canvasRef.current) return;
  
  const video = videoRef.current;
  const canvas = canvasRef.current;
  const ctx = canvas.getContext("2d");
  
  // Set canvas dimensions to match video
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  // Draw current video frame to canvas
  ctx?.drawImage(video, 0, 0);
  
  // Convert to blob for upload
  canvas.toBlob((blob) => {
    if (blob) {
      setCapturedPhoto(blob);
      setShowPreview(true);
    }
  }, "image/jpeg", 0.8); // 80% quality
}, []);
```

### 2. Photo Preview and Editing

After capture, users can:
- **Preview** the captured photo
- **Retake** if not satisfied
- **Confirm** to proceed with upload

The preview shows:
- Full-size captured image
- Retake button to capture again
- Submit button to proceed with check-in

### 3. Duplicate Prevention Check

Before uploading, the system checks for recent check-ins:

```typescript
// Client-side check
const since = new Date(Date.now() - CHECKIN_WINDOW_MINUTES * 60 * 1000).toISOString();
const { data: recent, error: recentErr } = await supabase
  .from("checkins")
  .select("id, created_at")
  .eq("user_id", user.id)
  .gte("created_at", since)
  .order("created_at", { ascending: false })
  .limit(1);

if (recent && recent.length > 0) {
  toast.info(`You already checked in within ${CHECKIN_WINDOW_MINUTES} minutes.`);
  return;
}
```

**Configuration:**
- Default window: 10 minutes
- Configurable via `CHECKIN_WINDOW_MINUTES` constant
- Prevents accidental duplicate submissions
- Shows user-friendly message when blocked

### 4. Photo Upload Process

#### Step 4.1: Request Signed Upload URL

```typescript
// Request signed upload URL from backend
const res = await fetch("/api/upload-url", { method: "POST" });
const { url, path } = await res.json();
```

**Backend Implementation** (`/src/app/api/upload-url/route.ts`):

```typescript
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Generate unique path for user's photo
  const path = `checkins/${user.id}/${Date.now()}.jpg`;
  
  // Create signed upload URL
  const { data, error } = await supabase.storage
    .from("checkin-photos")
    .createSignedUploadUrl(path);
    
  if (error || !data) {
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
  }
  
  return NextResponse.json({ 
    path, 
    token: data.token, 
    url: data.signedUrl 
  });
}
```

#### Step 4.2: Direct Upload to Storage

```typescript
// Upload blob directly to signed URL
const uploadRes = await fetch(url, {
  method: "PUT",
  body: blob,
  headers: { "Content-Type": "image/jpeg" }
});

if (!uploadRes.ok) {
  throw new Error("Upload failed");
}
```

#### Step 4.3: Generate Public URL

```typescript
// Get public URL for the uploaded photo
const { data: pub } = supabase.storage
  .from("checkin-photos")
  .getPublicUrl(path);
  
const photoUrl = pub.publicUrl;
```

### 5. Metadata Collection

The system automatically collects metadata for each check-in:

#### Device Information
```typescript
const deviceInfo = typeof navigator !== "undefined" ? navigator.userAgent : null;
```

**Collected Data:**
- Browser type and version
- Operating system
- Device model (when available)
- Screen resolution

#### Location Information
```typescript
// Optional: Get user's location (requires permission)
const getLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve(`${latitude},${longitude}`);
      },
      (error) => reject(error),
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
};
```

### 6. Check-In Record Creation

#### API Call to Create Check-In

```typescript
const post = await fetch("/api/checkins", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ 
    photoUrl, 
    location, 
    deviceInfo 
  }),
});
```

#### Backend Processing

**Location**: `/src/app/api/checkins/route.ts`

```typescript
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { photoUrl, location, deviceInfo } = await req.json();
  
  if (!photoUrl) {
    return NextResponse.json({ error: "photoUrl required" }, { status: 400 });
  }

  const { client } = createDrizzle();
  await client.connect();
  
  try {
    // Server-side duplicate prevention
    const since = new Date(Date.now() - CHECKIN_WINDOW_MINUTES * 60 * 1000).toISOString();
    const recent = await client.query(
      `SELECT id FROM checkins 
       WHERE user_id = $1 AND created_at >= $2 
       ORDER BY created_at DESC LIMIT 1`,
      [user.id, since]
    );
    
    if (recent.rows.length > 0) {
      return NextResponse.json(
        { error: `Already checked in within the last ${CHECKIN_WINDOW_MINUTES} minutes` },
        { status: 429 }
      );
    }

    // Insert new check-in record
    await client.query(
      `INSERT INTO checkins (user_id, photo_url, location, device_info) 
       VALUES ($1, $2, $3, $4)`,
      [user.id, photoUrl, location ?? null, deviceInfo ?? null]
    );
    
    return NextResponse.json({ ok: true });
  } finally {
    await client.end();
  }
}
```

### 7. Success Handling and Navigation

After successful check-in creation:

```typescript
toast.success("Check-in saved! Redirecting to history...");
router.push("/history");
```

**User Experience:**
- Success toast notification
- Automatic redirect to history page
- New check-in appears at top of history list
- Camera stream is stopped and cleaned up

## Error Handling

### Camera Errors

```typescript
const handleCameraError = (error: Error) => {
  switch (error.name) {
    case "NotAllowedError":
      setError("Camera access denied. Please allow camera access and refresh.");
      break;
    case "NotFoundError":
      setError("No camera found on this device.");
      break;
    case "NotSupportedError":
      setError("Camera not supported in this browser.");
      break;
    default:
      setError("Failed to access camera. Please try again.");
  }
};
```

### Upload Errors

```typescript
try {
  // Upload process
} catch (e: unknown) {
  const message = e instanceof Error ? e.message : "Check-in failed";
  toast.error(message);
  
  // Log error for debugging
  console.error("Check-in error:", e);
} finally {
  setIsSubmitting(false);
}
```

### Network Errors

- Retry mechanisms for temporary failures
- Offline detection and queuing (future enhancement)
- User-friendly error messages
- Graceful degradation when services unavailable

## Performance Optimizations

### Image Compression

```typescript
// Canvas-based compression
canvas.toBlob((blob) => {
  // Process compressed blob
}, "image/jpeg", 0.8); // 80% quality reduces file size
```

### Lazy Loading

- Camera stream only starts when component mounts
- Resources cleaned up when component unmounts
- Efficient memory management for mobile devices

### Upload Optimization

- Direct upload to storage bypasses application server
- Signed URLs prevent server bottlenecks
- Parallel processing of metadata collection

## Security Considerations

### Photo Privacy

- Photos stored in user-scoped storage paths
- Public read access for user's own photos only
- No cross-user photo access possible

### Upload Security

- Signed URLs prevent unauthorized uploads
- File type validation (JPEG only)
- Size limits enforced by storage service
- Path injection prevention via server-generated paths

### Metadata Privacy

- Device info anonymized (no personal identifiers)
- Location data optional and user-controlled
- No sensitive data stored in metadata

## Storage Configuration

### Supabase Storage Setup

**Bucket**: `checkin-photos`
- **Access**: Public read, authenticated write
- **Path Structure**: `checkins/{user_id}/{timestamp}.jpg`
- **File Types**: JPEG images only
- **Size Limits**: Configured in Supabase Dashboard

**Storage Policies**:
```sql
-- Allow public read access
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'checkin-photos');

-- Allow authenticated users to upload to their own folder
CREATE POLICY "User upload access" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'checkin-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

## Testing the Check-In Flow

### Manual Testing Checklist

1. **Camera Access**:
   - [ ] Camera permission requested
   - [ ] Video stream displays correctly
   - [ ] Front camera selected by default

2. **Photo Capture**:
   - [ ] Capture button works
   - [ ] Photo preview displays
   - [ ] Retake functionality works

3. **Upload Process**:
   - [ ] Upload progress indication
   - [ ] Success/error handling
   - [ ] Network failure recovery

4. **Duplicate Prevention**:
   - [ ] Recent check-in blocks new submission
   - [ ] Appropriate error message shown
   - [ ] Time window respected

5. **Data Storage**:
   - [ ] Check-in appears in history
   - [ ] Photo URL accessible
   - [ ] Metadata correctly stored

### Automated Testing

```typescript
describe("Check-in Flow", () => {
  test("should capture and upload photo", async () => {
    // Mock camera API
    // Test capture process
    // Verify upload and storage
  });
  
  test("should prevent duplicate check-ins", async () => {
    // Create recent check-in
    // Attempt new check-in
    // Verify rejection
  });
  
  test("should handle upload failures", async () => {
    // Mock upload failure
    // Verify error handling
    // Test retry mechanism
  });
});
```

## Future Enhancements

### Planned Features

1. **Offline Support**: Queue check-ins when offline
2. **Photo Filters**: Basic image enhancement options
3. **Batch Upload**: Multiple photos per check-in
4. **Location Names**: Reverse geocoding for readable locations
5. **Photo Compression**: Advanced compression algorithms
6. **Progress Indicators**: Detailed upload progress
7. **Photo Editing**: Basic crop and rotate functionality

### Performance Improvements

1. **WebP Support**: Modern image format for better compression
2. **Progressive Upload**: Upload while capturing for faster experience
3. **Caching**: Cache recent photos for offline viewing
4. **Lazy Loading**: Optimize history page photo loading
