import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { buildPasswordResetEmail } from "@/lib/email/templates";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { message: "If that email is registered, a reset link has been sent." },
        { status: 200 }
      );
    }

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    // Always return 200 to prevent email enumeration
    if (!user) {
      return NextResponse.json(
        { message: "If that email is registered, a reset link has been sent." },
        { status: 200 }
      );
    }

    // Invalidate prior unused tokens for this user
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, user.id));

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetLink = `${appUrl}/reset-password?token=${rawToken}`;

    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (resendKey && fromEmail) {
      const { subject, html } = buildPasswordResetEmail(resetLink);
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);
      await resend.emails.send({ from: fromEmail, to: email, subject, html });
    }

    return NextResponse.json(
      { message: "If that email is registered, a reset link has been sent." },
      { status: 200 }
    );
  } catch (error) {
    console.error("forgot-password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
