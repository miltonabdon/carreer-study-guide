import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { coachMessages } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const messages = await db
    .select({
      id: coachMessages.id,
      role: coachMessages.role,
      content: coachMessages.content,
      createdAt: coachMessages.createdAt,
    })
    .from(coachMessages)
    .where(eq(coachMessages.userId, session.user.id))
    .orderBy(asc(coachMessages.createdAt));

  return NextResponse.json({ messages });
}
