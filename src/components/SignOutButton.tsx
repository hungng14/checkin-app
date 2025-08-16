"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useState } from "react";

type SignOutButtonProps = {
  className?: string;
  labelHidden?: boolean;
};

export default function SignOutButton({ className, labelHidden = true }: SignOutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignOut() {
    try {
      setIsLoading(true);
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } finally {
      router.replace("/");
      // Ensure a fresh server render without session
      router.refresh();
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isLoading}
      className={cn(
        "flex items-center cursor-pointer gap-2 rounded-full px-4 py-2 text-sm transition-colors text-foreground/80 hover:text-foreground disabled:opacity-60",
        className
      )}
      aria-label="Sign out"
    >
      <LogOut className="h-4 w-4" />
      {!labelHidden && <span>Log out</span>}
    </button>
  );
}


