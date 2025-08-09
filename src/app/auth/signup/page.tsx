"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passwordsMismatch) {
      toast.error("Passwords do not match. Please confirm your password.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created!");
    router.replace("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="text-2xl font-semibold"
      >
        Sign Up
      </motion.h1>
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.35 }}
        className="flex flex-col gap-4"
      >
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-gradient-to-tr from-white/80 via-white/60 to-white/40 border-white/40 dark:from-white/15 dark:via-white/10 dark:to-white/5 dark:border-white/10"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-gradient-to-tr from-white/80 via-white/60 to-white/40 border-white/40 dark:from-white/15 dark:via-white/10 dark:to-white/5 dark:border-white/10"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={passwordsMismatch}
            className="bg-gradient-to-tr from-white/80 via-white/60 to-white/40 border-white/40 dark:from-white/15 dark:via-white/10 dark:to-white/5 dark:border-white/10"
            required
          />
          {passwordsMismatch && (
            <p className="text-sm text-destructive">Passwords do not match.</p>
          )}
        </div>
        <Button disabled={loading || passwordsMismatch}>
          {loading ? "Creating account..." : "Create Account"}
        </Button>
      </motion.form>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        className="text-sm text-muted-foreground"
      >
        Already have an account? <a href="/auth/signin" className="text-primary underline">Sign in</a>
      </motion.p>
    </main>
  );
}

