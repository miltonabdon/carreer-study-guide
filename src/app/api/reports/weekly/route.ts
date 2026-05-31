import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { weeklyReports } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reports = await db
    .select()
    .from(weeklyReports)
    .where(eq(weeklyReports.userId, session.user.id))
    .orderBy(desc(weeklyReports.periodStart));

  return NextResponse.json({ reports });
}
