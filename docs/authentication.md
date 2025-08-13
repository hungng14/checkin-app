# Authentication Flow Documentation

This document describes the complete authentication system used in the Check-In App, including user registration, sign-in, session management, and profile synchronization.

## Overview

The Check-In App uses **Supabase Auth** for authentication with the following key features:

- Email/password authentication
- Server-side session management with HTTP-only cookies
- Automatic profile creation and synchronization
- Row Level Security (RLS) for data access control
- Persistent sessions across browser sessions

## Architecture

### Client-Side Authentication
- **Browser Client**: `@supabase/ssr` with `createBrowserClient`
- **Server Client**: `@supabase/ssr` with `createServerClient`
- **Session Storage**: HTTP-only cookies managed by Next.js

### Authentication Flow Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Side   │    │   Server Side   │    │   Supabase      │
│                 │    │                 │    │                 │
│ - Sign In Form  │───▶│ - Session Check │───▶│ - Auth Service  │
│ - Sign Up Form  │    │ - Cookie Mgmt   │    │ - User Storage  │
│ - Auth Context  │    │ - Route Guards  │    │ - RLS Policies  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## User Registration Flow

### 1. Sign-Up Process

**Location**: `/src/app/auth/signup/page.tsx`

```typescript
async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  
  const { error } = await supabase.auth.signUp({ 
    email, 
    password 
  });
  
  if (error) {
    toast.error(error.message);
    return;
  }
  
  toast.success("Check your email to confirm your account!");
}
```

**Steps:**
1. User fills out registration form with email and password
2. Form submission calls `supabase.auth.signUp()`
3. Supabase sends confirmation email to user
4. User clicks confirmation link to activate account
5. User is redirected to sign-in page

### 2. Email Confirmation

- Supabase automatically sends confirmation emails
- Email templates can be customized in Supabase Dashboard
- Confirmation links redirect to the app with auth tokens
- Tokens are automatically processed by Supabase Auth

## User Sign-In Flow

### 1. Sign-In Process

**Location**: `/src/app/auth/signin/page.tsx`

```typescript
async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  
  const { error } = await supabase.auth.signInWithPassword({ 
    email, 
    password 
  });
  
  if (error) {
    toast.error(error.message);
    return;
  }
  
  toast.success("Signed in!");
  router.replace("/dashboard");
}
```

**Steps:**
1. User enters email and password
2. Form calls `supabase.auth.signInWithPassword()`
3. Supabase validates credentials
4. Session is created and stored in HTTP-only cookies
5. User is redirected to dashboard

### 2. Automatic Profile Synchronization

After successful sign-in, the profile sync process ensures user data consistency:

**Location**: `/src/app/api/profile/sync/route.ts`

```typescript
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if profile exists, create if missing
  // Update profile with latest auth data
}
```

## Session Management

### Server-Side Session Handling

**Location**: `/src/lib/supabase/server.ts`

```typescript
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get?.(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set?.(name, value, options);
        } catch {
          // Handle readonly contexts
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set?.(name, "", { ...options, maxAge: 0 });
        } catch {
          // Handle readonly contexts
        }
      },
    },
  });
}
```

### Client-Side Session Handling

**Location**: `/src/lib/supabase/client.ts`

```typescript
export function createSupabaseBrowserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
```

### Session Persistence

- Sessions are stored in HTTP-only cookies for security
- Cookies are automatically managed by Supabase Auth
- Sessions persist across browser restarts
- Automatic token refresh prevents session expiration

## Route Protection

### Server-Side Protection

Protected pages check authentication on the server:

```typescript
export default async function ProtectedPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/auth/signin");
  }
  
  // Render protected content
}
```

### Client-Side Protection

Navigation components check authentication state:

**Location**: `/src/components/AppNav.tsx`

```typescript
export default function AppNav() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    
    // Check initial session
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(!!data.session);
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsAuthenticated(!!session);
      }
    );

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);
}
```

## Profile Management

### Profile Creation

Profiles are automatically created during the sign-up process or first sign-in:

```sql
-- Profiles table structure
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  background_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Profile Synchronization

The profile sync endpoint ensures data consistency:

1. **Check Profile Existence**: Query for existing profile
2. **Create Missing Profile**: Insert new profile if none exists
3. **Update Profile Data**: Sync with latest auth information
4. **Generate Username**: Create unique username from email if needed

### Username Management

Users can update their usernames through the profile API:

**Validation Rules:**
- Minimum 2 characters
- Only alphanumeric characters and underscores
- Must be unique across all users
- Cannot be changed to an existing username

## Security Features

### Row Level Security (RLS)

Database policies ensure users can only access their own data:

```sql
-- Profiles policies
CREATE POLICY "profile is self" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Check-ins policies  
CREATE POLICY "read own checkins" ON checkins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert own checkins" ON checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Cookie Security

- HTTP-only cookies prevent XSS attacks
- Secure flag ensures HTTPS-only transmission
- SameSite attribute prevents CSRF attacks
- Automatic expiration and refresh

### Password Security

- Passwords are hashed by Supabase Auth
- Minimum password requirements enforced
- Password reset functionality available
- No passwords stored in application code

## Error Handling

### Authentication Errors

Common authentication errors and their handling:

```typescript
// Sign-in errors
if (error) {
  switch (error.message) {
    case "Invalid login credentials":
      toast.error("Invalid email or password");
      break;
    case "Email not confirmed":
      toast.error("Please check your email and confirm your account");
      break;
    default:
      toast.error(error.message);
  }
}
```

### Session Errors

- Expired sessions automatically redirect to sign-in
- Network errors show user-friendly messages
- Retry mechanisms for temporary failures

## Testing Authentication

### Manual Testing

1. **Registration Flow**:
   - Visit `/auth/signup`
   - Enter valid email and password
   - Check email for confirmation link
   - Click confirmation link

2. **Sign-In Flow**:
   - Visit `/auth/signin`
   - Enter confirmed credentials
   - Verify redirect to dashboard

3. **Session Persistence**:
   - Sign in and close browser
   - Reopen browser and visit app
   - Verify still authenticated

### Automated Testing

```typescript
// Example test structure
describe("Authentication", () => {
  test("should sign up new user", async () => {
    // Test registration flow
  });
  
  test("should sign in existing user", async () => {
    // Test sign-in flow
  });
  
  test("should protect routes", async () => {
    // Test route protection
  });
});
```

## Configuration

### Environment Variables

Required environment variables for authentication:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Database URL for server-side operations
DATABASE_URL=your_supabase_database_url
```

### Supabase Dashboard Configuration

1. **Auth Settings**: Configure email templates and providers
2. **RLS Policies**: Set up row-level security policies
3. **Storage Policies**: Configure file access permissions
4. **Email Templates**: Customize confirmation and reset emails

## Troubleshooting

### Common Issues

1. **"Invalid login credentials"**: Check email confirmation status
2. **Session not persisting**: Verify cookie settings and HTTPS
3. **Profile not found**: Ensure profile sync endpoint is called
4. **RLS policy errors**: Check database policies and user context

### Debug Tools

- Supabase Dashboard Auth logs
- Browser developer tools for cookie inspection
- Server logs for authentication errors
- Database query logs for RLS policy issues
