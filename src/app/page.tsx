"use client";

import { useState, useEffect, useCallback } from "react";

interface Rule {
  id: string;
  keyword: string;
  dmTemplate: string;
  reelId?: string;
  createdAt: string;
}

interface Log {
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

interface Analytics {
  totalComments: number;
  totalDmsSent: number;
  totalFailed: number;
  totalQueued: number;
  topKeywords: { keyword: string; count: number }[];
}

interface Reel {
  id: string;
  caption?: string;
  media_type: string;
  thumbnail_url?: string;
  permalink?: string;
}

const mono = "'JetBrains Mono', monospace";
const sans = "'Outfit', sans-serif";

const inputStyle: React.CSSProperties = {
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "12px 16px",
  color: "var(--text-primary)",
  fontSize: 14,
  fontFamily: mono,
  outline: "none",
  transition: "border-color 0.2s",
};

const labelStyle: React.CSSProperties = {
  fontFamily: mono,
  fontSize: 11,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: "var(--text-muted)",
};

function focusBorder(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = "var(--accent)";
}
function blurBorder(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = "var(--border)";
}

export default function Dashboard() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [reels, setReels] = useState<Reel[]>([]);
  const [reelsLoading, setReelsLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [dmTemplate, setDmTemplate] = useState("");
  const [reelId, setReelId] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "rules" | "reels" | "logs">(
    "overview"
  );

  const fetchRules = useCallback(async () => {
    const res = await fetch("/api/rules");
    if (res.ok) setRules(await res.json());
  }, []);

  const fetchLogs = useCallback(async () => {
    const res = await fetch("/api/logs");
    if (res.ok) setLogs(await res.json());
  }, []);

  const fetchAnalytics = useCallback(async () => {
    const res = await fetch("/api/analytics");
    if (res.ok) setAnalytics(await res.json());
  }, []);

  const fetchReels = useCallback(async () => {
    setReelsLoading(true);
    const res = await fetch("/api/reels");
    if (res.ok) setReels(await res.json());
    setReelsLoading(false);
  }, []);

  useEffect(() => {
    fetchRules();
    fetchLogs();
    fetchAnalytics();
  }, [fetchRules, fetchLogs, fetchAnalytics]);

  // Fetch reels lazily when the tab is first opened
  useEffect(() => {
    if (activeTab === "reels" && reels.length === 0 && !reelsLoading) {
      fetchReels();
    }
  }, [activeTab, reels.length, reelsLoading, fetchReels]);

  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim() || !dmTemplate.trim()) return;
    setLoading(true);
    const res = await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyword: keyword.trim(),
        dmTemplate: dmTemplate.trim(),
        reelId: reelId.trim() || undefined,
      }),
    });
    if (res.ok) {
      setKeyword("");
      setDmTemplate("");
      setReelId("");
      fetchRules();
    }
    setLoading(false);
  }

  async function removeRule(id: string) {
    await fetch("/api/rules", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchRules();
  }

  function createRuleForReel(reel: Reel) {
    setReelId(reel.id);
    setActiveTab("rules");
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  const statusColor: Record<string, string> = {
    sent: "var(--sent)",
    failed: "var(--failed)",
    queued: "var(--queued)",
    skipped: "var(--text-muted)",
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
      {/* Header */}
      <header style={{ marginBottom: 48, animation: "fadeInUp 0.5s ease both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--accent)",
              boxShadow: "0 0 12px var(--accent)",
              animation: "pulse-dot 2s ease-in-out infinite",
            }}
          />
          <span style={{ ...labelStyle, color: "var(--accent)", letterSpacing: 3 }}>
            Active
          </span>
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 700, margin: 0, letterSpacing: -1 }}>
          Auto<span style={{ color: "var(--accent)" }}>DM</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", margin: "8px 0 0", fontSize: 15 }}>
          Keyword-triggered DMs for Instagram comments
        </p>
      </header>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 32,
          borderBottom: "1px solid var(--border)",
          animation: "fadeInUp 0.5s ease 0.1s both",
        }}
      >
        {(["overview", "rules", "reels", "logs"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: "none",
              border: "none",
              padding: "12px 24px",
              fontSize: 14,
              fontFamily: mono,
              fontWeight: 500,
              cursor: "pointer",
              color: activeTab === tab ? "var(--accent)" : "var(--text-muted)",
              borderBottom:
                activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: -1,
              transition: "all 0.2s",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            {tab === "rules"
              ? `Rules (${rules.length})`
              : tab === "logs"
              ? `Logs (${logs.length})`
              : tab === "reels"
              ? `Reels (${reels.length})`
              : "Overview"}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div style={{ animation: "fadeInUp 0.3s ease both" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              marginBottom: 32,
            }}
          >
            {[
              {
                label: "Comments",
                value: analytics?.totalComments ?? "...",
                color: "var(--text-primary)",
              },
              {
                label: "DMs Sent",
                value: analytics?.totalDmsSent ?? "...",
                color: "var(--accent)",
              },
              {
                label: "Failed",
                value: analytics?.totalFailed ?? "...",
                color: "var(--danger)",
              },
              {
                label: "Queued",
                value: analytics?.totalQueued ?? "...",
                color: "var(--queued)",
              },
            ].map((stat, i) => (
              <div
                key={stat.label}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "20px 16px",
                  animation: `fadeInUp 0.3s ease ${i * 0.06}s both`,
                }}
              >
                <div style={{ ...labelStyle, marginBottom: 8 }}>{stat.label}</div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    fontFamily: mono,
                    color: stat.color,
                    letterSpacing: -1,
                  }}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 24,
              animation: "fadeInUp 0.3s ease 0.25s both",
            }}
          >
            <div style={{ ...labelStyle, marginBottom: 16 }}>Top Triggered Keywords</div>
            {!analytics?.topKeywords?.length ? (
              <div
                style={{
                  color: "var(--text-muted)",
                  fontFamily: mono,
                  fontSize: 13,
                  padding: "16px 0",
                  textAlign: "center",
                }}
              >
                No data yet
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {analytics.topKeywords.map((kw, i) => {
                  const maxCount = analytics.topKeywords[0].count;
                  const pct = maxCount > 0 ? (kw.count / maxCount) * 100 : 0;
                  return (
                    <div
                      key={kw.keyword}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        animation: `fadeInUp 0.3s ease ${0.3 + i * 0.05}s both`,
                      }}
                    >
                      <code
                        style={{
                          background: "var(--accent-dim)",
                          color: "var(--accent)",
                          padding: "3px 10px",
                          borderRadius: 5,
                          fontSize: 12,
                          fontFamily: mono,
                          fontWeight: 600,
                          minWidth: 80,
                          border: "1px solid var(--accent-mid)",
                        }}
                      >
                        {kw.keyword}
                      </code>
                      <div
                        style={{
                          flex: 1,
                          height: 6,
                          background: "var(--bg-input)",
                          borderRadius: 3,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            background: "var(--accent)",
                            borderRadius: 3,
                            transition: "width 0.6s ease",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontFamily: mono,
                          fontSize: 13,
                          color: "var(--text-secondary)",
                          minWidth: 32,
                          textAlign: "right",
                        }}
                      >
                        {kw.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === "rules" && (
        <div style={{ animation: "fadeInUp 0.3s ease both" }}>
          <form
            onSubmit={addRule}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 24,
              marginBottom: 24,
            }}
          >
            <div style={{ ...labelStyle, marginBottom: 16 }}>New Rule</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <input
                type="text"
                placeholder="keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                style={inputStyle}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
              <input
                type="text"
                placeholder="reel ID (optional — leave empty for all reels)"
                value={reelId}
                onChange={(e) => setReelId(e.target.value)}
                style={{
                  ...inputStyle,
                  ...(reelId
                    ? { borderColor: "var(--accent)", background: "var(--accent-dim)" }
                    : {}),
                }}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
              <input
                type="text"
                placeholder="DM template — use {{name}} for commenter's username"
                value={dmTemplate}
                onChange={(e) => setDmTemplate(e.target.value)}
                style={{ ...inputStyle, fontFamily: sans }}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
              <button
                type="submit"
                disabled={loading || !keyword.trim() || !dmTemplate.trim()}
                style={{
                  background: "var(--accent)",
                  color: "#0a0a0f",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 24px",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: mono,
                  cursor: loading ? "wait" : "pointer",
                  opacity: loading || !keyword.trim() || !dmTemplate.trim() ? 0.4 : 1,
                  transition: "all 0.2s",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                {loading ? "..." : "+ Add"}
              </button>
            </div>
          </form>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rules.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: 48,
                  color: "var(--text-muted)",
                  fontFamily: mono,
                  fontSize: 13,
                }}
              >
                No rules yet. Add one above.
              </div>
            )}
            {rules.map((rule, i) => (
              <div
                key={rule.id}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  animation: `fadeInUp 0.3s ease ${i * 0.05}s both`,
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "var(--border-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "var(--border)")
                }
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <code
                    style={{
                      background: "var(--accent-dim)",
                      color: "var(--accent)",
                      padding: "4px 12px",
                      borderRadius: 6,
                      fontSize: 13,
                      fontFamily: mono,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      border: "1px solid var(--accent-mid)",
                    }}
                  >
                    {rule.keyword}
                  </code>
                  {rule.reelId && (
                    <code
                      style={{
                        background: "var(--bg-input)",
                        color: "var(--text-muted)",
                        padding: "3px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontFamily: mono,
                        whiteSpace: "nowrap",
                      }}
                    >
                      reel:{rule.reelId.slice(0, 12)}...
                    </code>
                  )}
                  <span style={{ color: "var(--text-muted)", fontSize: 16 }}>&rarr;</span>
                  <span
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: 14,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {rule.dmTemplate}
                  </span>
                </div>
                <button
                  onClick={() => removeRule(rule.id)}
                  style={{
                    background: "var(--danger-dim)",
                    color: "var(--danger)",
                    border: "1px solid transparent",
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontFamily: mono,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--danger)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "transparent";
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reels Tab */}
      {activeTab === "reels" && (
        <div style={{ animation: "fadeInUp 0.3s ease both" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <span style={labelStyle}>Your Reels</span>
            <button
              onClick={fetchReels}
              style={{
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 12,
                fontFamily: mono,
                color: "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.color = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              Refresh
            </button>
          </div>

          {reelsLoading && (
            <div
              style={{
                textAlign: "center",
                padding: 48,
                color: "var(--text-muted)",
                fontFamily: mono,
                fontSize: 13,
              }}
            >
              Loading reels...
            </div>
          )}

          {!reelsLoading && reels.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: 48,
                color: "var(--text-muted)",
                fontFamily: mono,
                fontSize: 13,
              }}
            >
              No reels found.
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280, 1fr))",
              gap: 16,
            }}
          >
            {reels.map((reel, i) => {
              const hasRule = rules.some((r) => r.reelId === reel.id);
              return (
                <div
                  key={reel.id}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    overflow: "hidden",
                    animation: `fadeInUp 0.3s ease ${i * 0.04}s both`,
                    transition: "border-color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "var(--border-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "var(--border)")
                  }
                >
                  {/* Thumbnail */}
                  {reel.thumbnail_url ? (
                    <div
                      style={{
                        width: "100%",
                        height: 180,
                        backgroundImage: `url(${reel.thumbnail_url})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        position: "relative",
                      }}
                    >
                      {/* Play icon overlay */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(0,0,0,0.25)",
                        }}
                      >
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            background: "rgba(0,0,0,0.6)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <div
                            style={{
                              width: 0,
                              height: 0,
                              borderLeft: "14px solid white",
                              borderTop: "8px solid transparent",
                              borderBottom: "8px solid transparent",
                              marginLeft: 3,
                            }}
                          />
                        </div>
                      </div>
                      {/* Active rule badge */}
                      {hasRule && (
                        <div
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            background: "var(--accent)",
                            color: "#0a0a0f",
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontSize: 10,
                            fontFamily: mono,
                            fontWeight: 700,
                            letterSpacing: 1,
                            textTransform: "uppercase",
                          }}
                        >
                          Rule Active
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: 180,
                        background: "var(--bg-input)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text-muted)",
                        fontFamily: mono,
                        fontSize: 12,
                      }}
                    >
                      No thumbnail
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ padding: "14px 16px" }}>
                    <p
                      style={{
                        margin: "0 0 8px",
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        lineHeight: 1.4,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        minHeight: 36,
                      }}
                    >
                      {reel.caption || "No caption"}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <code
                        style={{
                          fontSize: 10,
                          fontFamily: mono,
                          color: "var(--text-muted)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {reel.id}
                      </code>

                      <button
                        onClick={() => createRuleForReel(reel)}
                        style={{
                          background: hasRule ? "var(--bg-input)" : "var(--accent-dim)",
                          color: hasRule ? "var(--text-muted)" : "var(--accent)",
                          border: `1px solid ${hasRule ? "var(--border)" : "var(--accent-mid)"}`,
                          borderRadius: 6,
                          padding: "6px 12px",
                          fontSize: 11,
                          fontFamily: mono,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          whiteSpace: "nowrap",
                          letterSpacing: 0.5,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "var(--accent)";
                          e.currentTarget.style.color = "#0a0a0f";
                          e.currentTarget.style.borderColor = "var(--accent)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = hasRule
                            ? "var(--bg-input)"
                            : "var(--accent-dim)";
                          e.currentTarget.style.color = hasRule
                            ? "var(--text-muted)"
                            : "var(--accent)";
                          e.currentTarget.style.borderColor = hasRule
                            ? "var(--border)"
                            : "var(--accent-mid)";
                        }}
                      >
                        {hasRule ? "+ Add Rule" : "Create Rule"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === "logs" && (
        <div style={{ animation: "fadeInUp 0.3s ease both" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <span style={labelStyle}>Recent Activity</span>
            <button
              onClick={fetchLogs}
              style={{
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 12,
                fontFamily: mono,
                color: "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.color = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              Refresh
            </button>
          </div>

          {logs.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: 48,
                color: "var(--text-muted)",
                fontFamily: mono,
                fontSize: 13,
              }}
            >
              No DMs sent yet. Waiting for comments...
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {logs.map((log, i) => (
              <div
                key={log.id}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "14px 20px",
                  animation: `fadeInUp 0.3s ease ${i * 0.03}s both`,
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "var(--border-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "var(--border)")
                }
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      @{log.commenterName}
                    </span>
                    <code
                      style={{
                        background: "var(--accent-dim)",
                        color: "var(--accent)",
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontFamily: mono,
                      }}
                    >
                      {log.matchedKeyword}
                    </code>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11,
                        fontFamily: mono,
                        fontWeight: 600,
                        color: statusColor[log.status] || "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: 1,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: statusColor[log.status] || "var(--text-muted)",
                        }}
                      />
                      {log.status}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        fontFamily: mono,
                      }}
                    >
                      {timeAgo(log.createdAt)}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    fontSize: 13,
                  }}
                >
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>Comment</span>
                    <p
                      style={{
                        margin: "4px 0 0",
                        color: "var(--text-secondary)",
                        lineHeight: 1.4,
                      }}
                    >
                      &ldquo;{log.comment}&rdquo;
                    </p>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>DM Sent</span>
                    <p
                      style={{
                        margin: "4px 0 0",
                        color: "var(--text-secondary)",
                        lineHeight: 1.4,
                      }}
                    >
                      {log.dmSent}
                    </p>
                  </div>
                </div>
                {log.error && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "6px 10px",
                      background: "var(--danger-dim)",
                      borderRadius: 6,
                      fontSize: 12,
                      color: "var(--danger)",
                      fontFamily: mono,
                    }}
                  >
                    {log.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
