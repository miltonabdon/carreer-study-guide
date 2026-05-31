import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { careerTargets } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const history = await db
    .select()
    .from(careerTargets)
    .where(eq(careerTargets.userId, userId))
    .orderBy(desc(careerTargets.createdAt));

  const [current] = history;
  return NextResponse.json({ current: current ?? null, history });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body: { description?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (description.length < 10) {
    return NextResponse.json(
      { error: "A descrição deve ter no mínimo 10 caracteres" },
      { status: 422 }
    );
  }
  if (description.length > 1000) {
    return NextResponse.json(
      { error: "A descrição deve ter no máximo 1000 caracteres" },
      { status: 422 }
    );
  }

  const [inserted] = await db
    .insert(careerTargets)
    .values({ userId, description })
    .returning();

  return NextResponse.json(inserted, { status: 201 });
}
