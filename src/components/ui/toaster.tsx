"use client";

import { Toaster } from "sonner";

export default function AppToaster() {
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      expand
      toastOptions={{
        classNames: {
          toast: "shadow-md",
        },
      }}
    />
  );
}


