"use client";

import { SessionProvider } from "next-auth/react";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        {children}
      </div>
    </SessionProvider>
  );
}
