"use client";

import { usePathname } from "next/navigation";
import { NavBar } from "./NavBar";

const AUTH_ROUTES = ["/login", "/register"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  if (isAuthRoute) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
