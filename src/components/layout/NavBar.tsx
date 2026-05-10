"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, BookOpen, TrendingUp, Brain, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/goals", label: "Goals", icon: BookOpen },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/coach", label: "Coach", icon: Brain },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-background sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="font-bold text-sm">
          StudyGuide AI
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:block">{label}</span>
              </Link>
            );
          })}

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="ml-2 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:block">Sign out</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
