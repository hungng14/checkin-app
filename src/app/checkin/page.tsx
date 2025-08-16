import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import CameraCapture from "@/components/CameraCapture";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function CheckinPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin");

  return (
    <main className="mx-auto max-w-md px-4 py-4 pb-24">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <Link href="/dashboard">
            <ArrowLeft className="h-5 w-5 text-slate-700 dark:text-slate-300" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            New Check-In
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Daily wellness capture
          </p>
        </div>
      </div>

      {/* Mobile full-bleed camera */}
      <div className="block md:hidden -mx-4">
        <div className="px-4">
          <h2 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-100">Live Camera Preview</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Position yourself comfortably and capture your daily check-in moment.</p>
        </div>
        <CameraCapture />
      </div>

      {/* Desktop/Tablet card layout */}
      <div className="hidden md:block">
        <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 border-slate-200/50 dark:border-slate-700/50 shadow-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
              <div className="p-2 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30">
                <ArrowLeft className="h-4 w-4 text-blue-600 dark:text-blue-400 rotate-180" />
              </div>
              Live Camera Preview
            </CardTitle>
            <CardDescription className="text-base text-slate-600 dark:text-slate-400">
              Position yourself comfortably and capture your daily check-in moment.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <CameraCapture />
          </CardContent>
        </Card>
      </div>

      {/* Tips Section */}
      <div className="mt-6 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-700/50 border border-slate-200/50 dark:border-slate-600/50 backdrop-blur-sm">
        <h3 className="font-semibold text-sm text-blue-700 dark:text-blue-400 mb-2">📸 Quick Tips</h3>
        <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
          <li>• Ensure good lighting for the best photo</li>
          <li>• Use the camera switch button if needed</li>
          <li>• Position your face within the guide circle</li>
        </ul>
      </div>
    </main>
  );
}

