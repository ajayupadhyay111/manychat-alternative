const GRAPH_API_BASE = "https://graph.instagram.com/v21.0";

function getAccessToken(): string {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) throw new Error("Missing INSTAGRAM_ACCESS_TOKEN");
  return token;
}

function getAppId(): string {
  const id = process.env.INSTAGRAM_APP_ID;
  if (!id) throw new Error("Missing INSTAGRAM_APP_ID");
  return id;
}

// Subscribe to Instagram webhooks programmatically
export async function subscribeToWebhooks(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const appId = getAppId();
    const appSecret = process.env.INSTAGRAM_APP_SECRET;
    if (!appSecret) {
      return { success: false, error: "Missing INSTAGRAM_APP_SECRET" };
    }

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${appId}/subscriptions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          object: "instagram",
          fields: "comments",
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/instagram`,
          verify_token: process.env.WEBHOOK_VERIFY_TOKEN,
          access_token: `${appId}|${appSecret}`,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message || "Failed to subscribe",
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// Get current webhook subscriptions
export async function getWebhookSubscriptions(): Promise<{
  success: boolean;
  data?: unknown;
  error?: string;
}> {
  try {
    const appId = getAppId();
    const appSecret = process.env.INSTAGRAM_APP_SECRET;
    if (!appSecret) {
      return { success: false, error: "Missing INSTAGRAM_APP_SECRET" };
    }

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${appId}/subscriptions?access_token=${appId}|${appSecret}`
    );

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message || "Failed to get subscriptions",
      };
    }

    return { success: true, data: data.data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// Fetch reels (VIDEO media) from the authenticated account
export async function getReels(): Promise<{
  success: boolean;
  data?: { id: string; caption?: string; media_type: string; thumbnail_url?: string; permalink?: string }[];
  error?: string;
}> {
  try {
    const accessToken = getAccessToken();
    const allReels: { id: string; caption?: string; media_type: string; thumbnail_url?: string; permalink?: string }[] = [];
    let url: string | null =
      `${GRAPH_API_BASE}/me/media?fields=id,caption,media_type,thumbnail_url,permalink&limit=50&access_token=${accessToken}`;

    while (url) {
      const res: Response = await fetch(url);
      const json = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: json.error?.message || "Failed to fetch media",
        };
      }

      const videos = (json.data ?? []).filter(
        (m: { media_type: string }) => m.media_type === "VIDEO"
      );
      allReels.push(...videos);

      url = json.paging?.next ?? null;
    }

    return { success: true, data: allReels };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function sendDirectMessage(
  recipientId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = getAccessToken();

    const meRes = await fetch(
      `${GRAPH_API_BASE}/me?fields=id&access_token=${accessToken}`
    );
    const meData = await meRes.json();

    if (!meRes.ok) {
      return {
        success: false,
        error: meData.error?.message || "Failed to get account ID",
      };
    }

    const pageId = meData.id;

    const res = await fetch(`${GRAPH_API_BASE}/${pageId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message },
        access_token: accessToken,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message || "Failed to send DM",
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function replyToComment(
  commentId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = getAccessToken();

    const res = await fetch(`${GRAPH_API_BASE}/${commentId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        access_token: accessToken,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message || "Failed to reply to comment",
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
