import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import AppToaster from '@/components/ui/toaster';
import AppNav from '@/components/AppNav';
import Image from 'next/image';
import backgroundImage from '@/assets/images/mona-jain-H96N9mpugpc.jpg';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  ),
  title: {
    default: 'Morning Check‑in — Healthy Habits Tracker',
    template: '%s — Morning Check‑in',
  },
  description:
    'Check in every morning to build healthy habits and earn points for your body. Track mood, sleep, hydration, and more with a simple daily ritual.',
  keywords: [
    'health tracker',
    'daily check-in',
    'habit tracker',
    'morning routine',
    'wellness',
    'points',
    'streaks',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Morning Check‑in',
    title: 'Morning Check‑in — Healthy Habits Tracker',
    description:
      'Check in every morning to build healthy habits and earn points for your body.',
    images: [
      {
        url: '/window.svg',
        width: 1200,
        height: 630,
        alt: 'Morning Check‑in',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Morning Check‑in — Healthy Habits Tracker',
    description:
      'Check in every morning to build healthy habits and earn points for your body.',
    images: ['/preview.png'],
  },
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-foreground min-h-dvh relative bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900`}
      >
        {/* Global background image + overlays */}
        <div
          aria-hidden
          className='pointer-events-none absolute inset-0 overflow-hidden'
        >
          <Image
            alt=''
            src={backgroundImage}
            className='h-full w-full object-cover scale-105 blur-sm md:blur'
          />
          <div className='absolute inset-0 bg-gradient-to-b from-white/50 via-white/40 to-white/60 dark:from-slate-900/60 dark:via-slate-900/60 dark:to-slate-900/80' />
          <div className='absolute -inset-16 bg-[radial-gradient(60%_60%_at_0%_0%,rgba(59,130,246,0.25),transparent_60%),radial-gradient(50%_50%_at_100%_100%,rgba(147,51,234,0.2),transparent_55%)]' />
        </div>

        {/* Foreground content container */}
        <div className='relative z-10 mx-auto min-h-dvh w-full max-w-screen-sm rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-4 sm:p-6 md:p-8 shadow-2xl supports-[backdrop-filter]:backdrop-blur-lg bg-white/80 dark:bg-slate-800/80'>
          {children}
        </div>
        <AppToaster />
        <AppNav />
      </body>
    </html>
  );
}
