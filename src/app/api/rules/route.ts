import { NextRequest, NextResponse } from "next/server";
import { getRules, createRule, deleteRule } from "@/lib/firestore";

export const dynamic = "force-dynamic";

export async function GET() {
  const rules = await getRules();
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const { keyword, dmTemplate, reelId } = await req.json();

  if (!keyword || !dmTemplate) {
    return NextResponse.json(
      { error: "keyword and dmTemplate are required" },
      { status: 400 }
    );
  }

  const rule = await createRule(keyword, dmTemplate, reelId);
  return NextResponse.json(rule, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await deleteRule(id);
  return NextResponse.json({ deleted: true });
}
