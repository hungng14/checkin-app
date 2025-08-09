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
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="rounded-full">
          <Link href="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">New Check-In</h1>
      </div>
      <Card className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
        <CardHeader>
          <CardTitle>Live Camera</CardTitle>
          <CardDescription>Align your face in frame and tap capture to record your check-in.</CardDescription>
        </CardHeader>
        <CardContent>
          <CameraCapture />
        </CardContent>
      </Card>
    </main>
  );
}

