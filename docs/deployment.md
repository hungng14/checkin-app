# Deployment and Configuration Guide

This document provides comprehensive instructions for deploying the Check-In App to production, including environment setup, Supabase configuration, and deployment best practices.

## Overview

The Check-In App is designed to be deployed on modern hosting platforms with the following requirements:

- **Runtime**: Node.js 22.x or higher
- **Package Manager**: pnpm 9.x or higher
- **Database**: PostgreSQL (via Supabase)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth

## Deployment Platforms

### Recommended Platforms

1. **Vercel** (Recommended)
   - Native Next.js support
   - Automatic deployments from Git
   - Edge functions for API routes
   - Built-in analytics and monitoring

2. **Netlify**
   - Good Next.js support
   - Form handling capabilities
   - CDN and edge functions

3. **Railway**
   - Simple deployment process
   - Database hosting options
   - Environment variable management

4. **Self-hosted**
   - Docker containerization
   - Full control over infrastructure
   - Custom domain and SSL

## Environment Configuration

### Required Environment Variables

Create these environment variables in your deployment platform:

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Database Connection (Required)
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Optional: Custom Configuration
CHECKIN_WINDOW_MINUTES=10
NODE_ENV=production
```

### Environment Variable Sources

1. **Supabase Dashboard**:
   - Go to Settings → API
   - Copy Project URL and anon/public key
   - Go to Settings → Database
   - Copy connection string for DATABASE_URL

2. **Security Considerations**:
   - Never commit `.env.local` to version control
   - Use platform-specific secret management
   - Rotate keys regularly
   - Use different keys for staging/production

## Supabase Setup

### 1. Create Supabase Project

```bash
# Using Supabase CLI (optional)
npx supabase init
npx supabase start
```

**Manual Setup**:
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Choose region closest to your users
4. Set strong database password

### 2. Database Schema Setup

**Option A: Using Drizzle Migrations**
```bash
# Set DATABASE_URL in environment
export DATABASE_URL="your_supabase_database_url"

# Run migrations
pnpm db:migrate
```

**Option B: Manual SQL Setup**
Run this SQL in Supabase SQL Editor:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  background_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create checkins table
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  location TEXT,
  device_info TEXT
);

-- Create follows table
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT follows_follower_id_following_id_unique UNIQUE(follower_id, following_id)
);

-- Create indexes
CREATE INDEX checkins_user_id_created_at_idx ON checkins(user_id, created_at DESC);
CREATE INDEX profiles_user_id_idx ON profiles(user_id);
```

### 3. Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profile is self" ON profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Checkins policies
CREATE POLICY "read own checkins" ON checkins
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert own checkins" ON checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Follows policies
CREATE POLICY "view own follows" ON follows
  FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);
CREATE POLICY "create own follows" ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "delete own follows" ON follows
  FOR DELETE USING (auth.uid() = follower_id);
```

### 4. Storage Buckets

**Create Buckets**:
1. Go to Storage in Supabase Dashboard
2. Create bucket: `checkin-photos`
   - Public: Yes
   - File size limit: 10MB
   - Allowed MIME types: `image/jpeg,image/png,image/webp`

3. Create bucket: `user-backgrounds`
   - Public: Yes
   - File size limit: 5MB
   - Allowed MIME types: `image/jpeg,image/png,image/webp`

**Storage Policies**:
```sql
-- checkin-photos policies
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'checkin-photos');

CREATE POLICY "User upload access" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'checkin-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- user-backgrounds policies
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-backgrounds');

CREATE POLICY "User upload access" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-backgrounds' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

### 5. Authentication Configuration

**Email Settings**:
1. Go to Authentication → Settings
2. Configure email templates:
   - Confirmation email
   - Password reset email
   - Magic link email

3. Set site URL and redirect URLs:
   - Site URL: `https://your-domain.com`
   - Redirect URLs: `https://your-domain.com/auth/callback`

**Security Settings**:
```json
{
  "SECURITY_CAPTCHA_ENABLED": false,
  "SECURITY_CAPTCHA_PROVIDER": "hcaptcha",
  "JWT_EXPIRY": 3600,
  "REFRESH_TOKEN_ROTATION_ENABLED": true,
  "SECURITY_REFRESH_TOKEN_REUSE_INTERVAL": 10
}
```

## Vercel Deployment

### 1. Project Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
vercel
```

### 2. Configuration

**vercel.json** (optional):
```json
{
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "regions": ["iad1"]
}
```

### 3. Environment Variables

Set in Vercel Dashboard or via CLI:
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add DATABASE_URL
```

### 4. Domain Configuration

1. Add custom domain in Vercel Dashboard
2. Configure DNS records:
   - A record: `@` → Vercel IP
   - CNAME record: `www` → `your-app.vercel.app`

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables for build
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN corepack enable pnpm && pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - DATABASE_URL=${DATABASE_URL}
    restart: unless-stopped
```

## Performance Optimization

### Next.js Configuration

**next.config.ts**:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
```

### Build Optimization

```bash
# Analyze bundle size
npx @next/bundle-analyzer

# Build with optimization
NODE_ENV=production pnpm build

# Check build output
pnpm start
```

## Monitoring and Analytics

### Error Tracking

**Sentry Integration**:
```bash
npm install @sentry/nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

### Performance Monitoring

**Vercel Analytics**:
```bash
npm install @vercel/analytics
```

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

## Security Considerations

### Production Security Checklist

- [ ] Environment variables secured
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Content Security Policy (CSP) configured
- [ ] Rate limiting implemented
- [ ] Database RLS policies tested
- [ ] File upload restrictions enforced
- [ ] Authentication flows tested
- [ ] Error messages don't leak sensitive information

### Content Security Policy

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline';
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: https:;
              connect-src 'self' https://*.supabase.co;
            `.replace(/\s{2,}/g, ' ').trim()
          }
        ]
      }
    ];
  }
};
```

## Backup and Recovery

### Database Backups

Supabase automatically creates daily backups. For additional protection:

```bash
# Manual backup using pg_dump
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < backup_20240115.sql
```

### Storage Backups

```bash
# Backup storage buckets using Supabase CLI
supabase storage download --bucket checkin-photos --destination ./backups/
```

## Troubleshooting

### Common Deployment Issues

1. **Build Failures**:
   - Check Node.js version compatibility
   - Verify all environment variables are set
   - Review build logs for specific errors

2. **Database Connection Issues**:
   - Verify DATABASE_URL format
   - Check Supabase project status
   - Test connection from deployment environment

3. **Authentication Problems**:
   - Verify Supabase URL and keys
   - Check redirect URL configuration
   - Test auth flow in production environment

4. **Storage Upload Failures**:
   - Verify storage bucket configuration
   - Check file size and type restrictions
   - Review storage policies

### Debug Tools

- **Vercel Function Logs**: Real-time function execution logs
- **Supabase Dashboard**: Database and auth monitoring
- **Browser DevTools**: Network and console debugging
- **Lighthouse**: Performance and accessibility auditing

## Maintenance

### Regular Tasks

1. **Weekly**:
   - Monitor error rates and performance
   - Review user feedback and issues
   - Check storage usage and costs

2. **Monthly**:
   - Update dependencies
   - Review security logs
   - Backup critical data

3. **Quarterly**:
   - Security audit and penetration testing
   - Performance optimization review
   - Disaster recovery testing

### Updates and Migrations

```bash
# Update dependencies
pnpm update

# Test in staging environment
pnpm build && pnpm start

# Deploy to production
vercel --prod
```
