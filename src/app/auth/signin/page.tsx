"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SignInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignInValues = z.infer<typeof SignInSchema>;

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [didSubmit, setDidSubmit] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<SignInValues>({
    resolver: zodResolver(SignInSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (didSubmit) return; // prevent re-submission during redirect window
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDidSubmit(true);
    toast.success("Signed in!");
    router.replace("/dashboard");
  });

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="text-2xl font-semibold text-slate-800 dark:text-slate-100"
      >
        Welcome back
      </motion.h1>

      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.35 }}
        className="flex flex-col gap-5"
      >
        <div className="grid gap-2">
          <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
            Email
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              disabled={isSubmitting || didSubmit}
              className={cn(
                "pl-10 bg-slate-50/80 dark:bg-slate-700/50 border-slate-300/60 dark:border-slate-600/60 text-slate-800 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400",
                errors.email && "border-destructive focus-visible:ring-destructive"
              )}
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
            Password
          </Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              disabled={isSubmitting || didSubmit}
              className={cn(
                "pl-10 pr-10 bg-slate-50/80 dark:bg-slate-700/50 border-slate-300/60 dark:border-slate-600/60 text-slate-800 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400",
                errors.password && "border-destructive focus-visible:ring-destructive"
              )}
              {...register("password")}
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((s) => !s)}
              disabled={isSubmitting || didSubmit}
              className="absolute cursor-pointer right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-500 hover:bg-slate-100/60 hover:text-slate-700 dark:hover:bg-slate-700/60 dark:text-slate-400 disabled:opacity-50"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={!isValid || isSubmitting || didSubmit}
          className={`${!isValid || isSubmitting || didSubmit ? '' : 'cursor-pointer'} w-full rounded-full gap-2 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 dark:from-blue-500 dark:to-indigo-500 dark:hover:from-blue-600 dark:hover:to-indigo-600`}
        >
          {isSubmitting || didSubmit ? (
            <>Signing in…</>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Sign In
            </>
          )}
        </Button>
      </motion.form>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        className="text-sm text-slate-600 dark:text-slate-400"
      >
        No account?{" "}
        <Link
          href="/auth/signup"
          className="underline decoration-blue-600/40 underline-offset-4 hover:text-blue-700 dark:decoration-blue-400/40 dark:hover:text-blue-300"
        >
          Create one
        </Link>
      </motion.p>
    </main>
  );
}
