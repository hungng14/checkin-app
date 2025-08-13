# API Documentation

This document provides comprehensive documentation for all API endpoints in the Check-In App.

## Base URL

All API endpoints are relative to your application's base URL:
```
https://your-app-domain.com/api
```

## Authentication

Most API endpoints require authentication. The app uses Supabase Auth with server-side session management via cookies. Ensure users are authenticated before making requests to protected endpoints.

### Authentication Headers

No additional headers are required as authentication is handled via HTTP-only cookies set by Supabase Auth.

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (not authenticated)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Endpoints

### Check-ins

#### GET /api/checkins

Retrieve the user's check-in history.

**Authentication:** Required

**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "photo_url": "https://storage-url/path/to/photo.jpg",
    "created_at": "2024-01-15T10:30:00Z",
    "location": "Optional location string",
    "device_info": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)..."
  }
]
```

**Example:**
```bash
curl -X GET https://your-app.com/api/checkins \
  -H "Cookie: your-session-cookie"
```

#### POST /api/checkins

Create a new check-in record.

**Authentication:** Required

**Request Body:**
```json
{
  "photoUrl": "https://storage-url/path/to/photo.jpg",
  "location": "Optional location string",
  "deviceInfo": "Optional device information"
}
```

**Response:**
```json
{
  "ok": true
}
```

**Error Responses:**
- `400` - Missing photoUrl
- `429` - Already checked in within the time window (default: 10 minutes)

**Example:**
```bash
curl -X POST https://your-app.com/api/checkins \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "photoUrl": "https://storage-url/photo.jpg",
    "location": "San Francisco, CA",
    "deviceInfo": "iPhone 15 Pro"
  }'
```

### File Upload

#### POST /api/upload-url

Generate a signed upload URL for photo uploads.

**Authentication:** Required

**Response:**
```json
{
  "path": "checkins/user-id/timestamp.jpg",
  "token": "signed-upload-token",
  "url": "https://storage-url/signed-upload-url"
}
```

**Usage Flow:**
1. Call this endpoint to get a signed upload URL
2. Upload the file directly to the returned URL using PUT
3. Use the returned path to construct the public URL
4. Create a check-in with the public photo URL

**Example:**
```bash
# Step 1: Get signed upload URL
curl -X POST https://your-app.com/api/upload-url \
  -H "Cookie: your-session-cookie"

# Step 2: Upload file to signed URL
curl -X PUT "https://signed-upload-url" \
  -H "Content-Type: image/jpeg" \
  --data-binary @photo.jpg
```

### Profile Management

#### GET /api/profile

Get the current user's profile information.

**Authentication:** Required

**Response:**
```json
{
  "profile": {
    "id": "uuid",
    "userId": "uuid",
    "username": "user123",
    "displayName": "John Doe",
    "backgroundUrl": "https://storage-url/background.jpg",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Error Responses:**
- `404` - Profile not found

#### POST /api/profile/sync

Synchronize user profile with authentication data. This endpoint is typically called after user registration or login to ensure profile data is up-to-date.

**Authentication:** Required

**Response:**
```json
{
  "success": true
}
```

**Example:**
```bash
curl -X POST https://your-app.com/api/profile/sync \
  -H "Cookie: your-session-cookie"
```

#### PUT /api/profile/username

Update the user's username.

**Authentication:** Required

**Request Body:**
```json
{
  "username": "new_username"
}
```

**Response:**
```json
{
  "success": true,
  "username": "new_username"
}
```

**Error Responses:**
- `400` - Username too short or invalid format
- `409` - Username already taken

**Username Requirements:**
- Minimum 2 characters
- Only letters, numbers, and underscores allowed
- Must be unique across all users

**Example:**
```bash
curl -X PUT https://your-app.com/api/profile/username \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"username": "my_new_username"}'
```

## Rate Limiting

### Check-in Window

The check-in endpoint implements a time-based rate limit to prevent duplicate check-ins:

- **Default Window:** 10 minutes
- **Configuration:** Set via `CHECKIN_WINDOW_MINUTES` constant in `/api/checkins/route.ts`
- **Behavior:** If a user attempts to check in within the window, they receive a 429 error

### Implementation Details

The rate limiting is implemented by:
1. Querying the user's most recent check-in
2. Comparing the timestamp with the current time minus the window duration
3. Rejecting the request if a check-in exists within the window

## Storage Integration

### Photo Storage

- **Bucket:** `checkin-photos`
- **Path Pattern:** `checkins/{user_id}/{timestamp}.jpg`
- **Access:** Public read, user-scoped write
- **File Types:** JPEG images
- **Upload Method:** Signed URLs for direct client upload

### Background Storage

- **Bucket:** `user-backgrounds`
- **Path Pattern:** `backgrounds/{user_id}/{timestamp}.{ext}`
- **Access:** Public read, user-scoped write
- **File Types:** Common image formats (JPEG, PNG, WebP)
- **Upload Method:** Direct upload via Supabase client

## Database Operations

All API endpoints use a combination of:
- **Supabase Auth** for user authentication and session management
- **Drizzle ORM** with direct PostgreSQL queries for data operations
- **Row Level Security (RLS)** policies for data access control

### Connection Management

- Each request creates a new database connection
- Connections are properly closed in `finally` blocks
- Connection pooling is handled by the underlying PostgreSQL driver

## Security Considerations

### Authentication
- All protected endpoints verify user authentication via Supabase Auth
- Session management uses HTTP-only cookies for security
- No sensitive data is exposed in client-side code

### Data Access
- Row Level Security (RLS) policies ensure users can only access their own data
- File uploads are scoped to user-specific paths
- All database queries include user ID filtering

### Input Validation
- Request bodies are validated for required fields
- Username format validation prevents injection attacks
- File upload paths are server-generated to prevent path traversal

## Testing

### Manual Testing

Use curl or a tool like Postman to test endpoints:

```bash
# Test authentication (should return 401)
curl -X GET https://your-app.com/api/profile

# Test with valid session
curl -X GET https://your-app.com/api/profile \
  -H "Cookie: sb-project-auth-token=your-token"
```

### Integration Testing

The API endpoints can be tested using:
- Jest with Supertest for endpoint testing
- Supabase local development environment
- Test database with isolated data

## Monitoring and Logging

### Error Logging
- Server errors are logged to console
- Database connection errors are caught and logged
- Authentication failures are handled gracefully

### Performance Monitoring
- Database query performance can be monitored via connection logs
- File upload performance depends on Supabase Storage
- API response times can be measured using Next.js built-in analytics
