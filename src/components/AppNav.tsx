"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Clock, Home, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import SignOutButton from "@/components/SignOutButton";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AppNav() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) setIsAuthenticated(!!data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) setIsAuthenticated(!!session);
    });

    return () => {
      isMounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  const hideOnAuthRoutes = pathname?.startsWith("/auth");
  if (hideOnAuthRoutes || !isAuthenticated) return null;

  const items = [
    { href: "/dashboard", label: "Home", Icon: Home },
    { href: "/social", label: "Social", Icon: Heart },
    { href: "/checkin", label: "Check-In", Icon: Camera },
    { href: "/history", label: "History", Icon: Clock },
  ];

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border bg-background/95 px-2 py-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/70">
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          const isPrimary = href === "/checkin";
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors",
                isPrimary
                  ? cn(
                      "bg-primary text-primary-foreground shadow-sm",
                      active && "ring-2 ring-primary/60"
                    )
                  : cn(
                      "text-foreground/80 hover:text-foreground",
                      active && "bg-muted text-foreground"
                    )
              )}
            >
              <Icon className={cn("h-4 w-4", active && !isPrimary && "text-foreground")} />
              {!isPrimary && <span className="hidden sm:inline">{label}</span>}
            </Link>
          );
        })}
        <div className="mx-1 h-5 w-px bg-border" aria-hidden />
        <SignOutButton />
      </div>
    </nav>
  );
}


