"use client";

import { Toaster } from "sonner";

export default function AppToaster() {
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      expand
      style={{
        // Ensure overlay over all app chrome
        zIndex: 60_000,
        // Respect iOS safe area
        paddingTop: "env(safe-area-inset-top)",
      }}
      toastOptions={{
        classNames: {
          toast: "shadow-md",
        },
      }}
    />
  );
}


