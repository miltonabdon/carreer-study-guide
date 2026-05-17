import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");
  const isOnboardingRoute = pathname.startsWith("/onboarding");

  if (!isLoggedIn && !isAuthRoute) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  if (isLoggedIn && !isOnboardingRoute) {
    const user = req.auth?.user as { onboardingCompleted?: boolean } | undefined;
    const onboardingCompleted = user?.onboardingCompleted ?? true;
    if (!onboardingCompleted) {
      return NextResponse.redirect(new URL("/onboarding", req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|api/|_next/static|_next/image|favicon.ico).*)"],
};
