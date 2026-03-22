import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

function parsePrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;

  // Base64-encoded: decode if it doesn't look like a PEM header
  if (!key.includes("-----BEGIN")) {
    return Buffer.from(key, "base64").toString("utf-8");
  }

  // Already PEM but with escaped newlines (e.g. from .env)
  return key.replace(/\\n/g, "\n");
}

function getDb(): Firestore {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
      }),
    });
  }
  return getFirestore();
}

export interface Rule {
  id: string;
  keyword: string;
  dmTemplate: string;
  reelId?: string;
  createdAt: string;
}

export interface Log {
  id: string;
  commenterId: string;
  commenterName: string;
  comment: string;
  matchedKeyword: string;
  ruleId: string;
  dmSent: string;
  status: "sent" | "failed" | "queued" | "skipped";
  error?: string;
  createdAt: string;
}

export interface QueueItem {
  id: string;
  recipientId: string;
  recipientName: string;
  message: string;
  commentId: string;
  commentText: string;
  ruleId: string;
  keyword: string;
  scheduledFor: string;
  status: "pending" | "processing" | "sent" | "failed";
  error?: string;
  createdAt: string;
}

// --- Rules ---

export async function getRules(): Promise<Rule[]> {
  const db = getDb();
  const snapshot = await db.collection("rules").orderBy("createdAt", "desc").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Rule));
}

export async function createRule(
  keyword: string,
  dmTemplate: string,
  reelId?: string
): Promise<Rule> {
  const data: Omit<Rule, "id"> = {
    keyword: keyword.toLowerCase().trim(),
    dmTemplate,
    createdAt: new Date().toISOString(),
  };
  if (reelId?.trim()) {
    data.reelId = reelId.trim();
  }
  const db = getDb();
  const ref = await db.collection("rules").add(data);
  return { id: ref.id, ...data };
}

export async function deleteRule(id: string): Promise<void> {
  const db = getDb();
  await db.collection("rules").doc(id).delete();
}

// --- Logs ---

export async function getLogs(limit = 50): Promise<Log[]> {
  const db = getDb();
  const snapshot = await db
    .collection("logs")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Log));
}

export async function createLog(log: Omit<Log, "id">): Promise<void> {
  const db = getDb();
  await db.collection("logs").add(log);
}

export async function hasAlreadySent(
  commenterId: string,
  ruleId: string
): Promise<boolean> {
  const db = getDb();
  const snapshot = await db
    .collection("logs")
    .where("commenterId", "==", commenterId)
    .where("ruleId", "==", ruleId)
    .where("status", "==", "sent")
    .limit(1)
    .get();
  return !snapshot.empty;
}

// --- Queue ---

export async function enqueue(item: Omit<QueueItem, "id">): Promise<void> {
  const db = getDb();
  await db.collection("queue").add(item);
}

export async function getPendingQueue(limit = 10): Promise<QueueItem[]> {
  const db = getDb();
  const now = new Date().toISOString();
  const snapshot = await db
    .collection("queue")
    .where("status", "==", "pending")
    .where("scheduledFor", "<=", now)
    .orderBy("scheduledFor", "asc")
    .limit(limit)
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as QueueItem));
}

export async function updateQueueItem(
  id: string,
  update: Partial<Pick<QueueItem, "status" | "error">>
): Promise<void> {
  const db = getDb();
  await db.collection("queue").doc(id).update(update);
}

export async function getRecentSentCount(
  minutes: number
): Promise<number> {
  const db = getDb();
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  const snapshot = await db
    .collection("logs")
    .where("status", "==", "sent")
    .where("createdAt", ">=", since)
    .get();
  return snapshot.size;
}

// --- Analytics ---

export async function getAnalytics(): Promise<{
  totalComments: number;
  totalDmsSent: number;
  totalFailed: number;
  totalQueued: number;
  topKeywords: { keyword: string; count: number }[];
}> {
  const db = getDb();
  const logsSnap = await db.collection("logs").get();

  let totalDmsSent = 0;
  let totalFailed = 0;
  let totalQueued = 0;
  const keywordCounts: Record<string, number> = {};

  for (const doc of logsSnap.docs) {
    const data = doc.data();
    if (data.status === "sent") totalDmsSent++;
    else if (data.status === "failed") totalFailed++;
    else if (data.status === "queued") totalQueued++;

    if (data.matchedKeyword) {
      keywordCounts[data.matchedKeyword] =
        (keywordCounts[data.matchedKeyword] || 0) + 1;
    }
  }

  const queueSnap = await db
    .collection("queue")
    .where("status", "==", "pending")
    .get();

  const topKeywords = Object.entries(keywordCounts)
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalComments: logsSnap.size,
    totalDmsSent,
    totalFailed,
    totalQueued: totalQueued + queueSnap.size,
    topKeywords,
  };
}
