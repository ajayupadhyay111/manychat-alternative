import { NextResponse } from "next/server";
import { getReels } from "@/lib/instagram";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getReels();
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result.data);
}
