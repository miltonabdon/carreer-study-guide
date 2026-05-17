import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const settingsSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  dailyAvailableMinutes: z.number().int().min(10).max(480).optional(),
  timezone: z.string().max(50).optional(),
  emailNotificationsEnabled: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  const { displayName, dailyAvailableMinutes, timezone, emailNotificationsEnabled } = parsed.data;

  if (displayName !== undefined) updates.displayName = displayName;
  if (dailyAvailableMinutes !== undefined) updates.dailyAvailableMinutes = dailyAvailableMinutes;
  if (timezone !== undefined) updates.timezone = timezone;
  if (emailNotificationsEnabled !== undefined) updates.emailNotificationsEnabled = emailNotificationsEnabled;

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, session.user.id))
    .returning({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      dailyAvailableMinutes: users.dailyAvailableMinutes,
      timezone: users.timezone,
      emailNotificationsEnabled: users.emailNotificationsEnabled,
    });

  return NextResponse.json(updated);
}
