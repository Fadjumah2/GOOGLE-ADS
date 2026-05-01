import React, { useState, useEffect, useCallback, useRef } from 'react';
import { API, starNum, starStr, relTime, fmtDate, fmtNum, auditTypeLabel, sparkFrom, findMetric } from './data.jsx';
import { T, Card, CardHead, Pill, Skel, Mono, Btn, Ico, openModal, closeModal, showToast } from './primitives.jsx';
import { NewPostModal } from './NewPostModal.jsx';
import { NewMediaModal } from './NewMediaModal.jsx';

export function AutopilotView({ lastRefreshed }) {
  const [loading, setLoading] = useState(true);
  const [apData, setApData] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [actionLoading, setActionLoading] = useState(null); // 'post' | 'replies' | 'cycle'
  const [actionResult, setActionResult] = useState(null);   // { type, data }
  const [actioningDraft, setActioningDraft] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [status, draftsData] = await Promise.all([
        API.apStatus(apiKey),
        API.getDrafts(apiKey)
      ]);
      setApData(status);
      setDrafts(draftsData.drafts || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
  }, [lastRefreshed, load]);

  const handleApprove = async (id) => {
    setActioningDraft(id);
    try {
      const res = await API.approveDraft(id);
      if (res.success) {
        showToast("Post published successfully", "good");
        load();
      } else throw new Error(res.error);
    } catch (e) { showToast("Failed to publish: " + e.message, "bad"); }
    finally { setActioningDraft(null); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this draft?")) return;
    setActioningDraft(id);
    try {
      const res = await API.deleteDraft(apiKey, id);
      if (res.success) {
        showToast("Draft deleted", "neutral");
        load();
      } else throw new Error(res.error);
    } catch (e) { showToast("Failed to delete: " + e.message, "bad"); }
    finally { setActioningDraft(null); }
  };

  const runAction = async (type, apiFn, label) => {
    setActionLoading(type);
    setActionResult(null);
    try {
      const data = await apiFn();
      setActionResult({ type, data });
      showToast(`${label} complete. See result below.`, "good");
      load();
    } catch (e) {
      showToast(e.message || `${label} failed.`, "bad");
    } finally {
      setActionLoading(null);
    }
  };

  const status = apData?.status || {};
  const calendar = apData?.calendar || [];
  const themeNames = { community_awareness: "Community", clinic_culture: "Clinic Culture", service_spotlight: "Services", wellness_tip: "Wellness Tip", did_you_know: "Did You Know", weekly_reminder: "Weekly Reminder", family_wellness: "Family" };

  const lastCycleTs = status.lastCycle?.ts;
  const postedToday = status.dailyPost?.postedToday;
  const nextRunLabel = postedToday ? "Tomorrow 09:00 EAT" : "Today 09:00 EAT";

  return (
    <div style={{ padding: "28px 32px 60px", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Status banner */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 20 }}>
          {[0, 1, 2, 3].map(i => <Skel key={i} h={80} />)}
        </div>
      ) : (
        <div style={{ padding: 24, borderRadius: 10, background: T.bgDark, color: T.bg, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 24, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, right: 0, width: 200, height: "100%", background: `radial-gradient(circle at top right, ${T.accent}, transparent 70%)`, opacity: 0.2 }} />
          {[
            { k: "Status",    v: status.enabled ? "Running" : "Disabled", tone: status.enabled ? "good" : "warn" },
            { k: "Last cycle", v: lastCycleTs ? relTime(lastCycleTs) : "Never" },
            { k: "Next run",  v: nextRunLabel },
            { k: "Uptime",    v: status.uptime || "—" },
          ].map((s, i) => (
            <div key={i} style={{ position: "relative", borderLeft: i === 0 ? "none" : "1px solid oklch(0.3 0.01 60)", paddingLeft: i === 0 ? 0 : 20 }}>
              <Mono size={10} color="oklch(0.6 0.01 60)">{s.k}</Mono>
              <div style={{ fontFamily: T.fontDisp, fontSize: 26, marginTop: 6, color: T.bg, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 8 }}>
                {s.tone === "good" && <span style={{ width: 10, height: 10, borderRadius: "50%", background: T.good, flexShrink: 0 }} />}
                {s.tone === "warn" && <span style={{ width: 10, height: 10, borderRadius: "50%", background: T.warn, flexShrink: 0 }} />}
                {s.v}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual controls */}
      <Card>
        <CardHead eyebrow="Controls" title="Manual actions" sub="Override the schedule or preview what the agent would publish — all go through the same policy guard as the cron job." />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn
            size="sm"
            disabled={!!actionLoading}
            onClick={() => runAction("post", () => API.previewPost(), "Post preview")}
          >
            {actionLoading === "post" ? <Mono size={11}>Generating…</Mono> : <><Ico name="sparkle" size={12} /> Preview today's post (dry-run)</>}
          </Btn>
          <Btn
            size="sm"
            disabled={!!actionLoading}
            onClick={() => runAction("replies", () => API.autoReply(apiKey, { dryRun: true }), "Reply drafts")}
          >
            {actionLoading === "replies" ? <Mono size={11}>Drafting…</Mono> : <><Ico name="sparkle" size={12} /> Draft reply queue (dry-run)</>}
          </Btn>
          <Btn
            size="sm"
            tone="solid"
            disabled={!!actionLoading}
            onClick={() => runAction("cycle", () => API.runDaily(apiKey, { force: false }), "Daily cycle")}
          >
            {actionLoading === "cycle" ? <Mono size={11}>Running…</Mono> : <><Ico name="play" size={12} /> Run full daily cycle</>}
          </Btn>
        </div>

        {/* Inline result panel */}
        {actionResult && (
          <div style={{ marginTop: 16, padding: 16, borderRadius: 8, background: T.bgSoft, border: `1px solid ${T.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <Mono size={11} color={T.ink}>{actionResult.type === "post" ? "Post preview" : actionResult.type === "replies" ? "Reply drafts" : "Cycle result"}</Mono>
              <button onClick={() => setActionResult(null)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 12, color: T.ink60 }}>dismiss</button>
            </div>
            {actionResult.type === "post" && (() => {
              const r = actionResult.data?.report;
              if (r?.skipped) return <div style={{ fontSize: 13, color: T.ink70 }}>Skipped: {(r.reasons || []).join(", ") || "unknown reason"}</div>;
              if (r?.dryRun) return (
                <div>
                  <Pill tone="warn" style={{ marginBottom: 8 }}>Dry-run — not published</Pill>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: T.ink, marginTop: 8 }}>{r.payload?.summary || "No text generated."}</div>
                  <Mono size={10} style={{ marginTop: 8 }}>Theme: {r.theme} · {r.dayName}</Mono>
                </div>
              );
              if (r?.error) return <div style={{ fontSize: 13, color: T.bad }}>{JSON.stringify(r.error)}</div>;
              return <div style={{ fontSize: 13, color: T.ink70 }}>No result data.</div>;
            })()}
            {actionResult.type === "replies" && (() => {
              const r = actionResult.data?.report;
              const candidates = r?.candidates || [];
              if (!candidates.length) return <div style={{ fontSize: 13, color: T.ink70 }}>No eligible reviews for auto-reply at this time.</div>;
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {candidates.map((c, i) => (
                    <div key={i} style={{ padding: 12, borderRadius: 6, background: T.bgElev, border: `1px solid ${T.line}` }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                        <Mono size={11}>{c.reviewer}</Mono>
                        <Mono size={11} color={T.ink60}>{c.starRating}</Mono>
                        {c.dryRun && <Pill tone="warn">dry-run</Pill>}
                        {c.published && <Pill tone="good">published</Pill>}
                        {c.skipped && <Pill tone="bad">rejected</Pill>}
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.55, color: T.ink80 }}>{c.draft || c.reply || (c.reasons || []).join(", ")}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
            {actionResult.type === "cycle" && (() => {
              const s = actionResult.data?.summary;
              if (!s) return <div style={{ fontSize: 13, color: T.ink70 }}>No summary returned.</div>;
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 13 }}>
                    <strong>Post:</strong> {s.postReport?.skipped ? `Skipped (${(s.postReport.reasons || []).join(", ")})` : s.postReport?.published ? "Published" : s.postReport?.dryRun ? "Dry-run" : s.postReport?.error ? "Error" : "—"}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    <strong>Replies:</strong> {s.replyReport?.skipped ? `Skipped (${(s.replyReport.reasons || []).join(", ")})` : `${(s.replyReport?.candidates || []).filter(c => c.published).length} published, ${(s.replyReport?.candidates || []).filter(c => c.dryRun).length} dry-run`}
                  </div>
                  <Mono size={10}>Completed in {s.durationMs}ms</Mono>
                </div>
              );
            })()}
          </div>
        )}
      </Card>

      {/* Feature flags */}
      <Card>
        <CardHead eyebrow="Configuration" title="Feature flags" sub="Set in Vercel → Project Settings → Environment Variables. Require a redeploy to take effect." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 0, border: `1px solid ${T.line}`, borderRadius: 8, overflow: "hidden" }}>
          {[
            { k: "AUTOPILOT_ENABLED",       on: status.enabled,                desc: "Master kill switch" },
            { k: "AUTOPILOT_DAILY_POST",     on: status.dailyPost?.enabled,     desc: "Publish one post per day at 09:00 EAT" },
            { k: "AUTOPILOT_AUTO_REPLY",     on: status.autoReplies?.enabled,   desc: "Auto-reply to safe 4★/5★ reviews" },
            { k: "AUTOPILOT_POST_DRY_RUN",   on: status.dailyPost?.dryRun,      desc: "Generate posts but don't publish" },
            { k: "AUTOPILOT_REPLY_DRY_RUN",  on: status.autoReplies?.dryRun,    desc: "Draft replies but don't send" },
            { k: "CRON_SECRET",              on: true,                          desc: "Bearer token for Vercel Cron auth (always set)" },
          ].map((f, i) => (
            <div key={f.k} style={{ padding: 16, borderLeft: i % 2 === 1 ? `1px solid ${T.line}` : "none", borderTop: i >= 2 ? `1px solid ${T.line}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <Mono size={11} color={T.ink}>{f.k}</Mono>
                <div style={{ fontSize: 12, color: T.ink60, marginTop: 3 }}>{f.desc}</div>
              </div>
              <div
                onClick={() => showToast(`${f.k} is set in Vercel env — redeploy to change.`, "neutral")}
                style={{ width: 36, height: 20, borderRadius: 999, background: f.on ? T.good : T.lineStrong, padding: 2, display: "flex", justifyContent: f.on ? "flex-end" : "flex-start", cursor: "pointer", flexShrink: 0 }}
              >
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: T.bg }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Drafts Queue */}
      <Card>
        <CardHead eyebrow="Pending approval" title="Drafts Queue" sub="AI-generated posts awaiting your review." />
        {loading ? (
          <Skel h={100} />
        ) : drafts.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {drafts.map(d => (
              <div key={d.id} style={{ padding: 16, border: `1px solid ${T.line}`, borderRadius: 8, background: T.bgSoft }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <Pill tone="accent">{d.payload.topicType}</Pill>
                  <Mono size={11}>{relTime(d.ts)}</Mono>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: T.ink80, marginBottom: 16 }}>{d.payload.summary}</div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <Btn size="sm" onClick={() => handleDelete(d.id)} disabled={!!actioningDraft}><Ico name="trash" size={12} /> Delete</Btn>
                  <Btn size="sm" tone="solid" onClick={() => handleApprove(d.id)} disabled={!!actioningDraft}>
                    {actioningDraft === d.id ? "Publishing..." : <><Ico name="check" size={12} /> Approve & Publish</>}
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 40, border: `1px dashed ${T.line}`, borderRadius: 8 }}>
            <Ico name="posts" size={24} color={T.ink40} style={{ marginBottom: 12 }} />
            <div style={{ color: T.ink60, fontSize: 13 }}>No pending drafts. Synapse will generate one during the next daily cycle.</div>
          </div>
        )}
      </Card>

      {/* Content calendar */}
      <Card>
        <CardHead eyebrow="Content strategy" title="Weekly rotation" sub="Themes cycle deterministically by day of week. Today's theme is highlighted." />
        {loading ? (
          <Skel h={200} />
        ) : calendar.length > 0 ? (
          <div data-keep-grid="7" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
            {calendar.map((d, i) => {
              const dDate = new Date(d.date);
              const todayDate = new Date();
              const isToday = dDate.toDateString() === todayDate.toDateString();
              const isPast = dDate < todayDate && !isToday;
              const dayLabel = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dDate.getDay()];
              const shippedToday = isToday && postedToday;
              return (
                <div key={i} style={{ padding: 14, borderRadius: 8, background: isToday ? T.ink : T.bgSoft, border: `1px solid ${isToday ? T.ink : T.line}`, color: isToday ? T.bg : T.ink, minHeight: 160, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <Mono size={10} color={isToday ? T.accent : T.ink60}>{dayLabel.toUpperCase()}</Mono>
                    <div style={{ fontFamily: T.fontDisp, fontSize: 22, color: isToday ? T.bg : T.ink }}>{dDate.getDate()}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginTop: 10, color: isToday ? T.bg : T.ink }}>{themeNames[d.theme] || d.theme}</div>
                  <div style={{ fontSize: 11, color: isToday ? "oklch(0.75 0.01 60)" : T.ink60, marginTop: 4, lineHeight: 1.4 }}>{d.tagline || "—"}</div>
                  <div style={{ flex: 1 }} />
                  {shippedToday ? <Pill tone="good" dot>Shipped today</Pill> : isPast ? <Pill tone="good">Shipped</Pill> : isToday ? <Pill tone="accent" dot>Today</Pill> : <Mono size={10}>Pending</Mono>}
                </div>
              );
            })}
          </div>
        ) : (
          <Mono size={12}>No calendar data available.</Mono>
        )}
      </Card>
    </div>
  );
}

export function ChatView() {
  const [input, setInput] = useState("");
  const [displayHistory, setDisplayHistory] = useState([]);
  const [apiHistory, setApiHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [displayHistory]);

  const handleSend = useCallback(async () => {
    if (!input.trim()) return;
    const msg = input.trim();
    setInput("");
    const updatedDisplay = [...displayHistory, { role: "user", msg }];
    setDisplayHistory(updatedDisplay);
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 55000);
    try {
      const res = await API.chat(apiKey, msg, apiHistory);
      setDisplayHistory([...updatedDisplay, { role: "assistant", msg: res.reply || "No response" }]);
      setApiHistory(res.history || []);
    } catch (e) {
      const errMsg = e.name === "AbortError"
        ? "The AI took too long to respond. Please try again."
        : (e.message || "Connection error — please check your network.");
      setDisplayHistory([...updatedDisplay, { role: "error", msg: errMsg }]);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, [input, displayHistory, apiHistory]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 82px)" }}>
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ textAlign: "center", padding: "20px 0 30px" }}>
            <div style={{ fontFamily: T.fontDisp, fontSize: 36, letterSpacing: "-0.02em" }}>How can I help today?</div>
            <div style={{ fontSize: 14, color: T.ink70, marginTop: 8 }}>Connected to 14 tools across your Google Business Profile.</div>
          </div>

          {displayHistory.length === 0 ? (
            <div style={{ textAlign: "center", color: T.ink60, padding: "40px 20px" }}>
              <Mono size={12}>Start a conversation to get AI-powered assistance with your business.</Mono>
            </div>
          ) : (
            displayHistory.map((m, i) => (
              <div key={i} style={{ display: "flex", gap: 12, flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: m.role === "user" ? T.bgSoft : T.ink, border: m.role === "user" ? `1px solid ${T.line}` : "none", color: m.role === "user" ? T.ink : T.accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.fontMono, fontSize: 11, fontWeight: 500 }}>
                  {m.role === "user" ? "H" : <Ico name="ai" size={13} />}
                </div>
                <div style={{ maxWidth: "80%" }}>
                  <div style={{ padding: "12px 16px", borderRadius: 10, background: m.role === "error" ? "oklch(0.97 0.01 25)" : m.role === "user" ? T.bgSoft : T.bgElev, border: `1px solid ${m.role === "error" ? "oklch(0.85 0.06 25)" : T.line}`, fontSize: 14, lineHeight: 1.55, color: m.role === "error" ? "oklch(0.45 0.12 25)" : "inherit" }}>
                    {m.msg}
                  </div>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: T.ink, display: "flex", alignItems: "center", justifyContent: "center" }}><Ico name="ai" size={13} color={T.accent} /></div>
              <div style={{ maxWidth: "80%", padding: "12px 16px", borderRadius: 10, background: T.bgElev, border: `1px solid ${T.line}`, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: T.ink70 }}>Thinking</span>
                <div style={{ display: "flex", gap: 3 }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: 3, height: 3, borderRadius: "50%", background: T.ink70, animation: `pulse 1.4s ${i * 0.2}s infinite` }} />)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: 20, borderTop: `1px solid ${T.line}`, background: T.bg }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            {["Show unanswered reviews", "Post about weekend hours", "Which day is my worst?", "Draft replies for today"].map(c => (
              <button key={c} onClick={() => setInput(c)} style={{ padding: "6px 12px", borderRadius: 999, border: `1px solid ${T.line}`, background: T.bgElev, fontSize: 12, color: T.ink70, cursor: "pointer", fontFamily: T.fontSans }}>{c}</button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, padding: 12, border: `1px solid ${T.lineStrong}`, borderRadius: 10, background: T.bgElev }}>
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())} placeholder="Ask Synapse anything about your business…" rows={1} style={{ flex: 1, border: "none", outline: "none", resize: "none", fontFamily: T.fontSans, fontSize: 14, lineHeight: 1.5, background: "transparent", color: T.ink, padding: 4 }} />
            <button onClick={handleSend} disabled={loading || !input.trim()} style={{ width: 32, height: 32, borderRadius: 6, background: T.ink, color: T.bg, border: "none", cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}><Ico name="send" size={14} color={T.bg} /></button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <Mono size={10}>14 tools · Gemini 2.5 Flash · audit-logged</Mono>
            <Mono size={10}>⏎ send · ⇧⏎ newline</Mono>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReviewsView({ reviews, searchTerm }) {
  const [filter, setFilter] = useState("all");

  const filteredReviews = reviews.filter(review => {
    if (!searchTerm) return true;
    const lowerSearchTerm = searchTerm.toLowerCase();
    const reviewerName = (review.reviewer || "").toLowerCase();
    const comment = (review.comment || "").toLowerCase();
    return reviewerName.includes(lowerSearchTerm) || comment.includes(lowerSearchTerm);
  });

  const stats = {
    all: filteredReviews.length,
    replied: filteredReviews.filter(r => r.hasReply).length,
    unanswered: filteredReviews.filter(r => !r.hasReply).length,
    flagged: filteredReviews.filter(r => !r.hasReply && starNum(r.starRating) <= 3).length
  };

  const filtered = filter === "all" ? filteredReviews : filter === "replied" ? filteredReviews.filter(r => r.hasReply) : filter === "unanswered" ? filteredReviews.filter(r => !r.hasReply && starNum(r.starRating) >= 4) : filteredReviews.filter(r => !r.hasReply && starNum(r.starRating) <= 3);

  return (
    <div style={{ padding: "28px 32px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4, padding: 3, background: T.bgSoft, borderRadius: 6, border: `1px solid ${T.line}` }}>
          {[
            { k: "all", l: `All · ${stats.all}` },
            { k: "replied", l: `Replied · ${stats.replied}` },
            { k: "unanswered", l: `Unanswered · ${stats.unanswered}` },
            { k: "flagged", l: `Flagged · ${stats.flagged}` }
          ].map(t => (
            <button key={t.k} onClick={() => setFilter(t.k)} style={{ padding: "6px 12px", border: "none", borderRadius: 4, background: filter === t.k ? T.bgElev : "transparent", fontFamily: T.fontMono, fontSize: 11, letterSpacing: "0.04em", color: filter === t.k ? T.ink : T.ink70, cursor: "pointer", boxShadow: filter === t.k ? "0 1px 2px rgba(0,0,0,0.04)" : "none" }}>{t.l}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn size="sm" onClick={async () => {
            try {
              const res = await API.autoReply(apiKey, { dryRun: true });
              const n = res?.drafts?.length ?? res?.count ?? 0;
              showToast(`Drafted ${n} reply${n === 1 ? "" : "s"} (dry-run). Open Audit log for details.`, "good");
            } catch (e) { showToast(e.message, "bad"); }
          }}><Ico name="sparkle" size={12} /> Draft all replies</Btn>
          <Btn size="sm" tone="solid" onClick={() => showToast("Export isn't wired up yet.", "neutral")}><Ico name="download" size={12} /> Export</Btn>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.length === 0 ? (
          <Card><Mono size={12}>No reviews found in this filter.</Mono></Card>
        ) : (
          filtered.map(r => {
            const stars = starNum(r.starRating);
            const status = r.hasReply ? "replied" : stars <= 3 ? "flagged" : "unanswered";
            const reviewer = r.reviewer || "Anonymous";
            return (
              <Card key={r.reviewId || r.id}>
                <div style={{ display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: T.bgSoft, border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.fontMono, fontSize: 12 }}>
                    {reviewer.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{reviewer}</span>
                      <span style={{ fontSize: 13 }}>{starStr(stars)}</span>
                      <Mono size={11}>{relTime(r.createTime)}</Mono>
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.6, color: T.ink80 }}>{r.comment || "(no text)"}</div>
                    {r.hasReply && (
                      <div style={{ marginTop: 12, padding: 14, background: T.bgSoft, borderRadius: 6, borderLeft: `3px solid ${T.good}` }}>
                        <Mono size={10} color={T.good}>AUTO-REPLIED · {relTime(r.replyTime)}</Mono>
                        <div style={{ fontSize: 13, marginTop: 4, color: T.ink80, lineHeight: 1.55 }}>{r.replyComment || "—"}</div>
                      </div>
                    )}
                  </div>
                  <Pill tone={status === "replied" ? "good" : status === "flagged" ? "bad" : "warn"}>{status}</Pill>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

export function PostsView({ searchTerm, lastRefreshed }) {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await API.posts(apiKey);
        setPosts(data.posts || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [lastRefreshed]);

  const filteredPosts = posts.filter(post => {
    if (!searchTerm) return true;
    const lowerSearchTerm = searchTerm.toLowerCase();
    const summary = (post.summary || "").toLowerCase();
    return summary.includes(lowerSearchTerm);
  });

  return (
    <div style={{ padding: "28px 32px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <Mono size={11}>{filteredPosts.length} posts · last 30 days</Mono>
        <Btn tone="solid" size="sm" onClick={() => openModal(<NewPostModal onClose={closeModal} />)}><Ico name="plus" size={12} /> New post</Btn>
      </div>
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {[0, 1, 2, 3].map(i => <Skel key={i} h={240} />)}
        </div>
      ) : filteredPosts.length === 0 ? (
        <Card><Mono size={12}>No posts found.</Mono></Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {filteredPosts.map(p => {
            const views = parseInt(p.topicViews || 0, 10);
            const clicks = parseInt(p.topicClicks || 0, 10);
            const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : "0.0";
            return (
              <Card key={p.postId || p.id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <Pill tone="good" dot>Live</Pill>
                  <Mono size={11}>{fmtDate(p.createTime)}</Mono>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: T.ink80, minHeight: 80 }}>{p.summary || p.text || "(no text)"}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
                  <div style={{ display: "flex", gap: 20 }}>
                    <div><Mono size={10}>Views</Mono><div style={{ fontFamily: T.fontDisp, fontSize: 20, marginTop: 2 }}>{fmtNum(views)}</div></div>
                    <div><Mono size={10}>Clicks</Mono><div style={{ fontFamily: T.fontDisp, fontSize: 20, marginTop: 2 }}>{fmtNum(clicks)}</div></div>
                    <div><Mono size={10}>CTR</Mono><div style={{ fontFamily: T.fontDisp, fontSize: 20, marginTop: 2 }}>{ctr}%</div></div>
                  </div>
                  <Btn size="sm" onClick={() => {
                    if (p.searchUrl || p.url) window.open(p.searchUrl || p.url, "_blank");
                    else showToast("This post has no public URL yet.", "neutral");
                  }}><Ico name="eye" size={12} /> View</Btn>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MediaTile({ item, index }) {
  const type = (item.type || item.mediaFormat || "").toUpperCase();
  const isVideo = type === "VIDEO";
  const url = item.thumbnailUrl || item.googleUrl || item.mediaUrl || item.sourceUrl || null;
  const [broken, setBroken] = useState(false);
  const showImage = !!url && !broken;
  const placeholder = `repeating-linear-gradient(${45 + index * 15}deg, oklch(0.32 0.02 ${50 + index * 10}), oklch(0.32 0.02 ${50 + index * 10}) 4px, oklch(0.28 0.02 ${50 + index * 10}) 4px, oklch(0.28 0.02 ${50 + index * 10}) 12px)`;
  return (
    <div style={{
      aspectRatio: "1",
      background: showImage ? T.bgSoft : placeholder,
      borderRadius: 8, border: `1px solid ${T.line}`,
      position: "relative", overflow: "hidden"
    }}>
      {showImage && (
        <img
          src={url}
          alt={item.description || (isVideo ? "video" : "photo")}
          loading="lazy"
          onError={() => setBroken(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      )}
      {isVideo && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 40, height: 40, borderRadius: "50%", background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ico name="play" size={16} color={T.bg} />
        </div>
      )}
      <div style={{ position: "absolute", bottom: 8, left: 8, padding: "2px 6px", borderRadius: 4, background: "rgba(0,0,0,0.55)" }}>
        <Mono size={9} color={T.ink80}>{isVideo ? "[ video ]" : "[ photo ]"}</Mono>
      </div>
    </div>
  );
}

export function MediaView({ searchTerm, lastRefreshed }) {
  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await API.media(apiKey);
        setMedia(data.media || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [lastRefreshed]);

  const filteredMedia = media.filter(item => {
    if (!searchTerm) return true;
    const lowerSearchTerm = searchTerm.toLowerCase();
    const description = (item.description || "").toLowerCase();
    return description.includes(lowerSearchTerm);
  });

  const photoCount = filteredMedia.filter(m => (m.type || m.mediaFormat || "").toUpperCase() === "PHOTO").length;
  const videoCount = filteredMedia.filter(m => (m.type || m.mediaFormat || "").toUpperCase() === "VIDEO").length;

  return (
    <div style={{ padding: "28px 32px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <Mono size={11}>{photoCount} photos · {videoCount} videos</Mono>
        <Btn size="sm" tone="solid" onClick={() => openModal(<NewMediaModal onClose={closeModal} />)}><Ico name="plus" size={12} /> Upload media</Btn>
      </div>
      {loading ? (
        <div data-keep-grid="4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <Skel key={i} style={{ aspectRatio: "1" }} />)}
        </div>
      ) : filteredMedia.length === 0 ? (
        <Card><Mono size={12}>No media found. Upload photos or videos to get started.</Mono></Card>
      ) : (
        <div data-keep-grid="4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {filteredMedia.map((m, i) => <MediaTile key={m.mediaId || i} item={m} index={i} />)}
        </div>
      )}
    </div>
  );
}

export function AuditView({ searchTerm, lastRefreshed }) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await API.auditLog(apiKey, 500);
        setEntries(data.entries || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [lastRefreshed]);

  const filteredEntries = entries.filter(entry => {
    if (!searchTerm) return true;
    const lowerSearchTerm = searchTerm.toLowerCase();
    const type = (entry.type || "").toLowerCase();
    const payload = (entry.payload?.msg || entry.payload?.reason || "").toLowerCase();
    return type.includes(lowerSearchTerm) || payload.includes(lowerSearchTerm);
  });

  return (
    <div style={{ padding: "28px 32px 60px" }}>
      <Card flush>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <Mono size={11}>{filteredEntries.length} entries · live tail</Mono>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.good }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn size="sm" onClick={() => showToast("Filter UI isn't wired up yet — use search to narrow.", "neutral")}><Ico name="filter" size={12} /> Filter</Btn>
            <Btn size="sm" onClick={() => showToast("CSV export isn't wired up yet.", "neutral")}><Ico name="download" size={12} /> Export CSV</Btn>
          </div>
        </div>
        <div>
          {loading ? (
            [0, 1, 2, 3, 4].map(i => <div key={i} style={{ padding: "12px 20px", borderTop: `1px solid ${T.line}` }}><Skel h={14} /></div>)
          ) : filteredEntries.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center" }}><Mono size={12}>No audit entries yet. Run the daily cycle to generate activity.</Mono></div>
          ) : (
            filteredEntries.map((l, i) => {
              const tone = l.type?.includes("rejected") || l.type?.includes("unauthorized") ? "bad" : l.type?.includes("skip") ? "warn" : "good";
              return (
                <div key={i} style={{ padding: "12px 20px", display: "grid", gridTemplateColumns: "140px 180px 90px 1fr", gap: 16, alignItems: "center", borderTop: i > 0 ? `1px solid ${T.line}` : "none", background: i % 2 === 0 ? "transparent" : T.bgSoft }}>
                  <Mono size={11}>{new Date(l.ts).toLocaleDateString("en-UG", { month: "short", day: "numeric" })} {new Date(l.ts).toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" })}</Mono>
                  <Mono size={11} color={T.ink}>{auditTypeLabel(l.type)}</Mono>
                  <Pill tone={tone}>{tone === "bad" ? "error" : tone}</Pill>
                  <span style={{ fontSize: 13, color: T.ink80 }}>{l.payload?.msg || l.payload?.reason || l.type}</span>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}

export function AnalyticsView({ reviews, searchTerm, lastRefreshed, apiKey }) {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState([]);
  const [period, setPeriod] = useState("last28");

  const load = useCallback(async (p) => {
    setLoading(true);
    try {
      const [ins] = await Promise.all([
        API.insights(p).catch(() => null),
      ]);
      setInsights(ins?.insights || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(period); }, [period, load, lastRefreshed]);

  // Build 4 KPI metrics from insights
  const kpis = (() => {
    if (!insights.length) return [];
    const cfg = [
      { label: "Profile views", parts: ["IMPRESSIONS"], color: T.accent },
      { label: "Direction requests", parts: ["DIRECTION_REQUESTS"], color: T.good },
      { label: "Calls", parts: ["CALL_CLICKS"], color: T.ink70 },
      { label: "Website clicks", parts: ["WEBSITE_CLICKS"], color: T.warn },
    ];
    return cfg.map(c => {
      const m = findMetric(insights, ...c.parts);
      if (!m) return null;
      const spark = sparkFrom(m);
      return { label: c.label, value: fmtNum(m.total), spark, color: c.color };
    }).filter(Boolean);
  })();

  // Chart series: impressions + direction requests
  const impressions = findMetric(insights, "IMPRESSIONS");
  const directions = findMetric(insights, "DIRECTION_REQUESTS");
  const chartA = impressions?.raw?.map(d => parseInt(d.value, 10) || 0) || [];
  const chartB = directions?.raw?.map(d => parseInt(d.value, 10) || 0) || [];

  // Review distribution
  const reviewStats = (() => {
    const counts = [0, 0, 0, 0, 0];
    reviews.forEach(r => {
      const stars = starNum(r.starRating);
      if (stars >= 1 && stars <= 5) counts[5 - stars]++;
    });
    const total = counts.reduce((a, b) => a + b, 0);
    return [5, 4, 3, 2, 1].map((s, i) => {
      const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
      return { stars: s, pct, count: counts[i] };
    });
  })();

  return (
    <div style={{ padding: "28px 32px 60px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Period selector */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ display: "flex", gap: 4, padding: 3, background: T.bgSoft, borderRadius: 6, border: `1px solid ${T.line}` }}>
          {[{ k: "last7", l: "7 days" }, { k: "last28", l: "28 days" }, { k: "last90", l: "90 days" }].map(t => (
            <button key={t.k} onClick={() => setPeriod(t.k)} style={{ padding: "6px 12px", border: "none", borderRadius: 4, background: period === t.k ? T.bgElev : "transparent", fontFamily: T.fontMono, fontSize: 11, letterSpacing: "0.04em", color: period === t.k ? T.ink : T.ink70, cursor: "pointer", boxShadow: period === t.k ? "0 1px 2px rgba(0,0,0,0.04)" : "none" }}>{t.l}</button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {[0,1,2,3].map(i => <Skel key={i} h={110} />)}
        </div>
      ) : kpis.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {kpis.map((k, i) => (
            <Card key={i}>
              <Mono size={10}>{k.label}</Mono>
              <div style={{ fontFamily: T.fontDisp, fontSize: 36, letterSpacing: "-0.02em", color: k.color, marginTop: 6 }}>{k.value}</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 32, marginTop: 10 }}>
                {k.spark.map((v, j) => {
                  const max = Math.max(...k.spark, 1);
                  const h = Math.max(2, Math.round((v / max) * 32));
                  return <div key={j} style={{ flex: 1, height: h, background: k.color, opacity: 0.4, borderRadius: 2 }} />;
                })}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card><Mono size={12}>No insights data available for this period.</Mono></Card>
      )}

      {/* Bar charts */}
      {!loading && (chartA.length > 0 || chartB.length > 0) && (
        <Card>
          <CardHead eyebrow="Traffic" title="Profile views & direction requests" sub="Daily totals for the selected period." />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 16 }}>
            {[
              { label: "Profile views", data: chartA, color: T.accent },
              { label: "Direction requests", data: chartB, color: T.good }
            ].map((s, si) => {
              const max = Math.max(...s.data, 1);
              return (
                <div key={si}>
                  <Mono size={10}>{s.label}</Mono>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 60, marginTop: 8 }}>
                    {s.data.map((v, j) => {
                      const h = Math.max(2, Math.round((v / max) * 60));
                      return <div key={j} style={{ flex: 1, height: h, background: s.color, opacity: 0.55, borderRadius: 2 }} />;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Review star distribution */}
      <Card>
        <CardHead eyebrow="Reviews" title="Star rating distribution" sub="Breakdown of all reviews by rating." />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {reviewStats.map(r => (
            <div key={r.stars} style={{ display: "grid", gridTemplateColumns: "48px 1fr 36px", gap: 12, alignItems: "center" }}>
              <Mono size={11}>{r.stars} ★</Mono>
              <div style={{ height: 8, background: T.bgSoft, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${r.pct}%`, background: r.stars >= 4 ? T.good : r.stars === 3 ? T.warn : T.bad, borderRadius: 4 }} />
              </div>
              <Mono size={11}>{r.count}</Mono>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function ServicesView({ lastRefreshed }) {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await API.services(apiKey);
        setServices(data.services || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [lastRefreshed]);

  return (
    <div style={{ padding: "28px 32px 60px" }}>
      <div style={{ marginBottom: 20 }}>
        <Mono size={11}>{loading ? "Loading…" : `${services.length} services`}</Mono>
      </div>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0,1,2,3,4].map(i => <Skel key={i} h={68} />)}
        </div>
      ) : services.length === 0 ? (
        <Card><Mono size={12}>No services found for this location.</Mono></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {services.map((s, i) => (
            <Card key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{s.displayName || "(unnamed)"}</div>
                  {s.description && <div style={{ fontSize: 13, color: T.ink70, marginTop: 4, lineHeight: 1.5 }}>{s.description}</div>}
                </div>
                <Pill tone={s.type === "structured" ? "good" : "warn"}>{s.type === "structured" ? "structured" : "custom"}</Pill>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReportsView() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [period, setPeriod] = useState("last28");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await API.getReport(apiKey, period);
        if (res.success) setReport(res.report);
      } catch (e) { showToast("Failed to load report", "bad"); }
      finally { setLoading(false); }
    };
    load();
  }, [period]);

  if (loading) return <div style={{ padding: 32 }}><Skel h={400} /></div>;

  const stats = report?.stats || {};

  return (
    <div style={{ padding: "28px 32px 60px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 800 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: T.fontDisp, fontSize: 32, letterSpacing: "-0.01em" }}>Performance Report</div>
          <Mono size={12} color={T.ink60} style={{ marginTop: 4 }}>Last 28 Days · {new Date(report?.generatedAt).toLocaleDateString()}</Mono>
        </div>
        <Btn tone="solid" onClick={() => window.print()}><Ico name="download" size={12} /> Download PDF</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {[
          { l: "Reach", v: fmtNum(stats.impressions), s: "Profile Views" },
          { l: "Engagement", v: fmtNum(stats.calls + stats.website + stats.directions), s: "Total Actions" },
          { l: "Reputation", v: stats.avgRating, s: `${stats.reviewsCount} New Reviews` }
        ].map((k, i) => (
          <Card key={i}>
            <Label color={T.ink40}>{k.l}</Label>
            <div style={{ fontFamily: T.fontDisp, fontSize: 36, marginTop: 8 }}>{k.v}</div>
            <Mono size={10} color={T.ink60} style={{ marginTop: 4 }}>{k.s}</Mono>
          </Card>
        ))}
      </div>

      <Card>
        <CardHead eyebrow="Executive Summary" title="AI Analysis" />
        <div style={{ fontSize: 15, lineHeight: 1.7, color: T.ink80, whiteSpace: "pre-wrap" }}>
          {report?.summary}
        </div>
      </Card>

      <Card flush>
        <div style={{ padding: 20, borderBottom: `1px solid ${T.line}` }}><Label>Detailed Breakdown</Label></div>
        <div style={{ padding: "10px 0" }}>
          {[
            { l: "Website Clicks", v: stats.website },
            { l: "Phone Calls", v: stats.calls },
            { l: "Direction Requests", v: stats.directions },
            { l: "Total Profile Impressions", v: stats.impressions }
          ].map((row, i) => (
            <div key={i} style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", borderBottom: i < 3 ? `1px solid ${T.line}` : "none" }}>
              <span style={{ fontSize: 14 }}>{row.l}</span>
              <Mono size={13} weight={600}>{fmtNum(row.v)}</Mono>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function SettingsView({ apiKey, setApiKey }) {
  const [keyVisible, setKeyVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newKey, setNewKey] = useState("");
  const currentKey = apiKey;
  const masked = currentKey
    ? currentKey.slice(0, 6) + "••••••••••••••••••••" + currentKey.slice(-4)
    : "(none set)";

  const handleSave = () => {
    if (!newKey.trim()) return;
    setApiKey(newKey.trim());
    setEditing(false);
    setNewKey("");
    showToast("API key updated", "good");
  };

  const handleClear = () => {
    setApiKey(null);
    showToast("API key cleared", "warn");
  };

  return (
    <div style={{ padding: "28px 32px 60px", display: "flex", flexDirection: "column", gap: 20, maxWidth: 640 }}>

      {/* API Key */}
      <Card>
        <CardHead eyebrow="Authentication" title="API key" sub="Authenticates every request from this browser to your Synapse backend." />
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              type="password"
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSave()}
              placeholder="Paste new API key…"
              autoFocus
              style={{ padding: "10px 12px", border: `1px solid ${T.lineStrong}`, borderRadius: 6, fontFamily: T.fontMono, fontSize: 13, background: T.bgElev, color: T.ink, outline: "none", width: "100%", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <Btn tone="solid" size="sm" onClick={handleSave}>Save</Btn>
              <Btn size="sm" onClick={() => { setEditing(false); setNewKey(""); }}>Cancel</Btn>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: T.bgSoft, borderRadius: 6, border: `1px solid ${T.line}`, marginBottom: 12 }}>
              <Mono size={12} style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {keyVisible ? currentKey : masked}
              </Mono>
              <Btn size="sm" onClick={() => setKeyVisible(v => !v)}>
                <Ico name="eye" size={12} /> {keyVisible ? "Hide" : "Show"}
              </Btn>
              <Btn size="sm" onClick={() => setEditing(true)}>
                <Ico name="edit" size={12} /> Change
              </Btn>
            </div>
            <Btn size="sm" tone="danger" onClick={handleClear}>
              <Ico name="trash" size={12} /> Clear key &amp; sign out
            </Btn>
          </>
        )}
      </Card>

      {/* Business info */}
      <Card>
        <CardHead eyebrow="Business" title="Eritage ENT Care" sub="Entebbe, Uganda · Google Business Profile." />
        <div style={{ display: "flex", flexDirection: "column", border: `1px solid ${T.line}`, borderRadius: 8, overflow: "hidden" }}>
          {[
            { k: "Business name",    v: "Eritage ENT Care" },
            { k: "Location",         v: "Entebbe, Uganda" },
            { k: "Platform",         v: "Google Business Profile" },
            { k: "Owner",            v: "Fahad Juma" },
            { k: "Synapse version",  v: "1.0.0 MVP" },
          ].map((row, i) => (
            <div key={row.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: i > 0 ? `1px solid ${T.line}` : "none" }}>
              <Mono size={11}>{row.k}</Mono>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{row.v}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Autopilot flags */}
      <Card>
        <CardHead eyebrow="Autopilot" title="Feature flags" sub="Set in Vercel → Project Settings → Environment Variables. Require a redeploy to take effect." />
        <div style={{ display: "flex", flexDirection: "column", border: `1px solid ${T.line}`, borderRadius: 8, overflow: "hidden" }}>
          {[
            { k: "AUTOPILOT_ENABLED",       desc: "Master kill switch" },
            { k: "AUTOPILOT_DAILY_POST",     desc: "Publish one post per day at 09:00 EAT" },
            { k: "AUTOPILOT_AUTO_REPLY",     desc: "Auto-reply to safe 4★/5★ reviews" },
            { k: "AUTOPILOT_POST_DRY_RUN",   desc: "Generate posts but don't publish" },
            { k: "AUTOPILOT_REPLY_DRY_RUN",  desc: "Draft replies but don't send" },
            { k: "CRON_SECRET",              desc: "Bearer token for Vercel Cron auth" },
          ].map((f, i) => (
            <div key={f.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: i > 0 ? `1px solid ${T.line}` : "none" }}>
              <div>
                <Mono size={11} color={T.ink}>{f.k}</Mono>
                <div style={{ fontSize: 12, color: T.ink60, marginTop: 3 }}>{f.desc}</div>
              </div>
              <Pill tone="neutral">Vercel env</Pill>
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
}

export function StrategyView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [strategy, setStrategy] = useState({ weeklyThemes: [], knowledgeBase: [] });
  const [sentiment, setSentiment] = useState(null);
  const [activeDay, setActiveDay] = useState(new Date().getDay());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [stratRes, sentRes] = await Promise.all([
          API.getStrategy(apiKey),
          API.getSentiment(apiKey)
        ]);
        if (stratRes.success) setStrategy(stratRes.strategy);
        if (sentRes.success) setSentiment(sentRes.sentiment);
      } catch (e) { showToast("Failed to load strategy data", "bad"); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await API.updateStrategy(strategy);
      if (res.success) showToast("Strategy saved successfully", "good");
      else throw new Error(res.error);
    } catch (e) { showToast("Failed to save strategy: " + e.message, "bad"); }
    finally { setSaving(false); }
  };

  const updateDayTheme = (idx, key, val) => {
    const next = { ...strategy };
    next.weeklyThemes[idx] = { ...next.weeklyThemes[idx], [key]: val };
    setStrategy(next);
  };

  const updateKB = (idx, val) => {
    const next = { ...strategy };
    next.knowledgeBase[idx] = val;
    setStrategy(next);
  };

  const addKB = () => {
    const next = { ...strategy };
    next.knowledgeBase.push("");
    setStrategy(next);
  };

  const removeKB = (idx) => {
    const next = { ...strategy };
    next.knowledgeBase.splice(idx, 1);
    setStrategy(next);
  };

  if (loading) return <div style={{ padding: 32 }}><Skel h={300} /></div>;

  const currentDay = strategy.weeklyThemes[activeDay] || {};
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div style={{ padding: "28px 32px 60px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: T.fontDisp, fontSize: 32, letterSpacing: "-0.01em" }}>AI Strategy</div>
          <div style={{ fontSize: 14, color: T.ink70, marginTop: 4 }}>Customize how Synapse AI writes posts and grounded replies.</div>
        </div>
        <Btn tone="solid" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save all changes"}
        </Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 24, alignItems: "start" }}>
        {/* Left: Navigation */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card flush>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.line}` }}><Label>Content Schedule</Label></div>
            {days.map((d, i) => (
              <div key={d} onClick={() => setActiveDay(i)} style={{
                padding: "12px 16px", cursor: "pointer",
                background: activeDay === i ? T.accentSoft : "transparent",
                borderLeft: activeDay === i ? `3px solid ${T.accent}` : "3px solid transparent",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                transition: "background 0.1s"
              }}>
                <span style={{ fontSize: 13, fontWeight: activeDay === i ? 600 : 400, color: activeDay === i ? T.ink : T.ink80 }}>{d}day Theme</span>
                <Ico name="arrow" size={11} color={activeDay === i ? T.accent : T.ink40} />
              </div>
            ))}
          </Card>

          <Card flush>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.line}` }}><Label>Grounding</Label></div>
            <div style={{ padding: "12px 16px", fontSize: 13, color: T.ink70 }}>
              The Knowledge Base provides specific facts about Eritage ENT Care that the AI uses to ensure accuracy.
            </div>
          </Card>
        </div>

        {/* Right: Editor */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Day Editor */}
          <Card>
            <CardHead eyebrow={`${days[activeDay]}day focus`} title="Post configuration" />
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <Label color={T.ink40} style={{ marginBottom: 8, display: "block" }}>Theme ID</Label>
                <input
                  value={currentDay.theme || ""}
                  onChange={e => updateDayTheme(activeDay, "theme", e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", background: T.bgSoft, border: `1px solid ${T.line}`, borderRadius: 6, color: T.ink, fontFamily: T.fontMono, fontSize: 13 }}
                />
              </div>
              <div>
                <Label color={T.ink40} style={{ marginBottom: 8, display: "block" }}>AI Prompt / Instruction</Label>
                <textarea
                  value={currentDay.prompt || ""}
                  onChange={e => updateDayTheme(activeDay, "prompt", e.target.value)}
                  rows={6}
                  style={{ width: "100%", padding: "12px", background: T.bgSoft, border: `1px solid ${T.line}`, borderRadius: 6, color: T.ink, fontFamily: T.fontSans, fontSize: 13, lineHeight: 1.5, resize: "vertical" }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <Label color={T.ink40} style={{ marginBottom: 8, display: "block" }}>Topic Type</Label>
                  <select
                    value={currentDay.topicType || "STANDARD"}
                    onChange={e => updateDayTheme(activeDay, "topicType", e.target.value)}
                    style={{ width: "100%", padding: "10px", background: T.bgSoft, border: `1px solid ${T.line}`, borderRadius: 6, color: T.ink }}>
                    <option value="STANDARD">Standard Post</option>
                    <option value="OFFER">Offer / Promotion</option>
                    <option value="EVENT">Event</option>
                  </select>
                </div>
                <div>
                  <Label color={T.ink40} style={{ marginBottom: 8, display: "block" }}>CTA Action</Label>
                  <select
                    value={currentDay.callToAction?.actionType || "LEARN_MORE"}
                    onChange={e => updateDayTheme(activeDay, "callToAction", { ...currentDay.callToAction, actionType: e.target.value })}
                    style={{ width: "100%", padding: "10px", background: T.bgSoft, border: `1px solid ${T.line}`, borderRadius: 6, color: T.ink }}>
                    <option value="LEARN_MORE">Learn More</option>
                    <option value="BOOK">Book Appointment</option>
                    <option value="CALL">Call Now</option>
                    <option value="ORDER">Order Online</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>

          {/* Knowledge Base Editor */}
          <Card>
            <CardHead eyebrow="Clinic grounding" title="Knowledge Base" right={<Btn size="sm" onClick={addKB}><Ico name="plus" size={12} /> Add fact</Btn>} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(strategy.knowledgeBase || []).map((fact, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8 }}>
                  <input
                    value={fact}
                    onChange={e => updateKB(idx, e.target.value)}
                    placeholder="Enter a clinic fact (e.g. 'We are open until 7pm on Tuesdays')"
                    style={{ flex: 1, padding: "10px 12px", background: T.bgSoft, border: `1px solid ${T.line}`, borderRadius: 6, color: T.ink, fontSize: 13 }}
                  />
                  <button onClick={() => removeKB(idx)} style={{ background: "transparent", border: "none", color: T.bad, cursor: "pointer", padding: 8 }}><Ico name="trash" size={14} /></button>
                </div>
              ))}
              {strategy.knowledgeBase?.length === 0 && <div style={{ textAlign: "center", padding: 20, color: T.ink40 }}><Mono size={12}>No facts added yet.</Mono></div>}
            </div>
          </Card>

          {/* Suggested Facts */}
          {sentiment?.facts?.length > 0 && (
            <Card>
              <CardHead eyebrow="AI Discovery" title="Suggested Facts" sub="Extracted from recent 4-5 star reviews." />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {sentiment.facts.map((fact, idx) => (
                  <div key={idx} style={{ padding: "10px 12px", background: T.accentSoft, border: `1px solid ${T.accent}`, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: T.ink }}>{fact}</span>
                    <Btn size="sm" onClick={() => {
                      const next = { ...strategy };
                      if (!next.knowledgeBase.includes(fact)) {
                        next.knowledgeBase.push(fact);
                        setStrategy(next);
                        showToast("Fact added to Knowledge Base", "good");
                      }
                    }}>Add to KB</Btn>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

  );
}
        </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

  );
}
}
}
}
}
