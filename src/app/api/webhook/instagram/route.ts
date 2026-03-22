import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getRules, createLog, hasAlreadySent, enqueue } from "@/lib/firestore";
import { replyToComment } from "@/lib/instagram";

export const dynamic = "force-dynamic";

// GET — Meta webhook verification
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// POST — incoming webhook events
export async function POST(req: NextRequest) {
  const body = await req.text();

  // Verify signature from Meta
  const signature = req.headers.get("x-hub-signature-256");
  if (signature && process.env.INSTAGRAM_APP_SECRET) {
    const expectedSig =
      "sha256=" +
      crypto
        .createHmac("sha256", process.env.INSTAGRAM_APP_SECRET)
        .update(body)
        .digest("hex");

    if (signature !== expectedSig) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
  }

  const payload = JSON.parse(body);

  if (payload.object === "instagram") {
    const rules = await getRules();

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field === "comments") {
          const comment = change.value;
          await processComment(comment, rules);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}

async function processComment(
  comment: {
    id: string;
    text: string;
    media: { id: string };
    from: { id: string; username: string };
  },
  rules: Awaited<ReturnType<typeof getRules>>
) {
  const commentText = comment.text.toLowerCase();
  const mediaId = comment.media?.id;

  for (const rule of rules) {
    // Check keyword match
    if (!commentText.includes(rule.keyword)) continue;

    // Check reel-specific filter
    if (rule.reelId && rule.reelId !== mediaId) continue;

    // One-time DM: skip if already sent to this user for this rule
    const alreadySent = await hasAlreadySent(comment.from.id, rule.id);
    if (alreadySent) {
      await createLog({
        commenterId: comment.from.id,
        commenterName: comment.from.username,
        comment: comment.text,
        matchedKeyword: rule.keyword,
        ruleId: rule.id,
        dmSent: rule.dmTemplate,
        status: "skipped",
        error: "Already sent DM to this user for this rule",
        createdAt: new Date().toISOString(),
      });
      break;
    }

    // Post public comment reply
    await replyToComment(comment.id, "Check your DMs! \u{1F4E9}");

    // Replace {{name}} placeholder
    const personalizedMessage = rule.dmTemplate.replace(
      /\{\{name\}\}/gi,
      comment.from.username
    );

    // Schedule DM with 2-3 minute delay (random for natural behavior)
    const delayMs = (120 + Math.floor(Math.random() * 60)) * 1000;
    const scheduledFor = new Date(Date.now() + delayMs).toISOString();

    await enqueue({
      recipientId: comment.from.id,
      recipientName: comment.from.username,
      message: personalizedMessage,
      commentId: comment.id,
      commentText: comment.text,
      ruleId: rule.id,
      keyword: rule.keyword,
      scheduledFor,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    await createLog({
      commenterId: comment.from.id,
      commenterName: comment.from.username,
      comment: comment.text,
      matchedKeyword: rule.keyword,
      ruleId: rule.id,
      dmSent: personalizedMessage,
      status: "queued",
      createdAt: new Date().toISOString(),
    });

    // First matching rule wins
    break;
  }
}
