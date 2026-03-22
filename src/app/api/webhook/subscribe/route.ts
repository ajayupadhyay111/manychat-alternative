import { NextResponse } from "next/server";
import {
  subscribeToWebhooks,
  getWebhookSubscriptions,
} from "@/lib/instagram";

export const dynamic = "force-dynamic";

// GET — check current webhook subscriptions
export async function GET() {
  const result = await getWebhookSubscriptions();
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ subscriptions: result.data });
}

// POST — subscribe to Instagram comment webhooks
export async function POST() {
  const result = await subscribeToWebhooks();
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ subscribed: true });
}
