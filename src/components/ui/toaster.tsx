"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-center"
      toastOptions={{
        style: {
          background: "#1a1a1a",
          border: "1px solid #2e2b26",
          color: "#f3eee4",
          borderRadius: "0",
          fontSize: "0.85rem",
        },
      }}
    />
  );
}
