import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { users, passwordResetTokens, sessions } from "@/lib/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password || typeof token !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const now = new Date();

    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now)
        )
      )
      .limit(1);

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Atomically mark token used and update password
    await db.transaction(async (tx) => {
      await tx
        .update(passwordResetTokens)
        .set({ usedAt: now })
        .where(eq(passwordResetTokens.id, resetToken.id));

      await tx
        .update(users)
        .set({ passwordHash, updatedAt: now })
        .where(eq(users.id, resetToken.userId));

      // Invalidate all active sessions for the user
      await tx
        .delete(sessions)
        .where(eq(sessions.userId, resetToken.userId));
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("reset-password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
