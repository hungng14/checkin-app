import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppToaster from "@/components/ui/toaster";
import AppNav from "@/components/AppNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: {
    default: "Morning Check‑in — Healthy Habits Tracker",
    template: "%s — Morning Check‑in",
  },
  description:
    "Check in every morning to build healthy habits and earn points for your body. Track mood, sleep, hydration, and more with a simple daily ritual.",
  keywords: [
    "health tracker",
    "daily check-in",
    "habit tracker",
    "morning routine",
    "wellness",
    "points",
    "streaks",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Morning Check‑in",
    title: "Morning Check‑in — Healthy Habits Tracker",
    description:
      "Check in every morning to build healthy habits and earn points for your body.",
    images: [
      {
        url: "/window.svg",
        width: 1200,
        height: 630,
        alt: "Morning Check‑in",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Morning Check‑in — Healthy Habits Tracker",
    description:
      "Check in every morning to build healthy habits and earn points for your body.",
    images: ["/preview.png"],
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-foreground min-h-dvh relative bg-[linear-gradient(to_bottom,_#f7d488_0%,_#fbfbea_22%,_#e7f7ee_38%,_#a8d5c8_60%,_#2a4a5e_86%,_#193043_100%)]`}
      >
        <div className="mx-auto min-h-dvh w-full max-w-screen-sm rounded-2xl border border-white/40 p-4 sm:p-6 md:p-8 shadow-2xl supports-[backdrop-filter]:backdrop-blur-lg bg-gradient-to-tr from-white/80 via-white/60 to-white/40 dark:border-white/10 dark:from-white/15 dark:via-white/10 dark:to-white/5">
          {children}
        </div>
        <AppToaster />
        <AppNav />
      </body>
    </html>
  );
}
