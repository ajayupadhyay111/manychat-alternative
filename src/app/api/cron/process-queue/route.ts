import { NextRequest, NextResponse } from "next/server";
import {
  getPendingQueue,
  updateQueueItem,
  createLog,
  getRecentSentCount,
} from "@/lib/firestore";
import { sendDirectMessage } from "@/lib/instagram";

export const dynamic = "force-dynamic";

const MAX_PER_MINUTE = 10;
const MAX_PER_HOUR = 100;

// POST — called by a cron job (e.g., every minute)
// Protect with a secret header or Vercel cron
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.WEBHOOK_VERIFY_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check rate limits
  const sentLastMinute = await getRecentSentCount(1);
  const sentLastHour = await getRecentSentCount(60);

  if (sentLastHour >= MAX_PER_HOUR) {
    return NextResponse.json({
      processed: 0,
      reason: "Hourly rate limit reached",
    });
  }

  const minuteBudget = MAX_PER_MINUTE - sentLastMinute;
  const hourBudget = MAX_PER_HOUR - sentLastHour;
  const budget = Math.min(minuteBudget, hourBudget);

  if (budget <= 0) {
    return NextResponse.json({
      processed: 0,
      reason: "Rate limit reached",
    });
  }

  const items = await getPendingQueue(budget);
  let processed = 0;

  for (const item of items) {
    await updateQueueItem(item.id, { status: "processing" });

    const result = await sendDirectMessage(item.recipientId, item.message);

    if (result.success) {
      await updateQueueItem(item.id, { status: "sent" });
      await createLog({
        commenterId: item.recipientId,
        commenterName: item.recipientName,
        comment: item.commentText,
        matchedKeyword: item.keyword,
        ruleId: item.ruleId,
        dmSent: item.message,
        status: "sent",
        createdAt: new Date().toISOString(),
      });
    } else {
      await updateQueueItem(item.id, {
        status: "failed",
        error: result.error,
      });
      await createLog({
        commenterId: item.recipientId,
        commenterName: item.recipientName,
        comment: item.commentText,
        matchedKeyword: item.keyword,
        ruleId: item.ruleId,
        dmSent: item.message,
        status: "failed",
        error: result.error,
        createdAt: new Date().toISOString(),
      });
    }

    processed++;
  }

  return NextResponse.json({ processed, budget });
}
