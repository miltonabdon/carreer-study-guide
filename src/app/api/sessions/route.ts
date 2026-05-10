import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { studySessions, topics } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({
  topicId: z.string().uuid().optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query params" }, { status: 400 });
  }

  const { topicId, from, to, limit, offset } = parsed.data;

  const conditions = [eq(studySessions.userId, session.user.id)];
  if (topicId) conditions.push(eq(studySessions.topicId, topicId));
  if (from) conditions.push(gte(studySessions.studiedAt, from));
  if (to) conditions.push(lte(studySessions.studiedAt, to));

  const rows = await db
    .select({
      id: studySessions.id,
      topicId: studySessions.topicId,
      sessionType: studySessions.sessionType,
      studiedAt: studySessions.studiedAt,
      durationMinutes: studySessions.durationMinutes,
      confidenceRating: studySessions.confidenceRating,
      notes: studySessions.notes,
      topicTitle: topics.title,
    })
    .from(studySessions)
    .innerJoin(topics, eq(studySessions.topicId, topics.id))
    .where(and(...conditions))
    .orderBy(desc(studySessions.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json(rows);
}
