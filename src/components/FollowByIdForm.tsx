"use client";

import { useState } from "react";

import { UserPlus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function FollowByIdForm() {
  const [userId, setUserId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleFollow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) {
      toast.error("Please enter a user ID");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followingId: userId.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("User followed successfully!");
        setUserId("");
      } else {
        toast.error(data.error || "Failed to follow user");
      }
    } catch (error) {
      console.error("Follow error:", error);
      toast.error("Failed to follow user");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Follow by User ID
        </CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          For testing: Enter another user&apos;s ID to follow them
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleFollow} className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder="Enter user ID (UUID)"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="bg-slate-50/80 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
            />
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              You can find user IDs in the browser&apos;s developer tools or database
            </p>
          </div>
          <Button
            type="submit"
            disabled={isLoading || !userId.trim()}
            className="w-full rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Following...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Follow User
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
