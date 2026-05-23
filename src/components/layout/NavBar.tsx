"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, BookOpen, TrendingUp, Brain, Settings, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/goals", label: "Metas", icon: BookOpen },
  { href: "/progress", label: "Progresso", icon: TrendingUp },
  { href: "/coach", label: "Coach", icon: Brain },
  { href: "/settings", label: "Config", icon: Settings },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border/60 bg-background/95 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 h-full flex items-center justify-between">
        {/* Logo mark */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-sm tracking-tight text-foreground">
            StudyGuide
          </span>
        </Link>

        {/* Nav + Sign out */}
        <nav className="flex items-center">
          <div className="flex items-center gap-0.5">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-150 ${
                    active
                      ? "text-primary bg-primary/[0.08] font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 transition-colors duration-150 ${active ? "text-primary" : "text-muted-foreground"}`}
                  />
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Separator */}
          <div className="w-px h-4 bg-border/60 mx-1" />

          {/* Sign out — icon only */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="ml-3 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </nav>
      </div>
    </header>
  );
}
