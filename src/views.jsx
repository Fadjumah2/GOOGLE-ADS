import React, { useState, useEffect, useCallback, useRef } from 'react';
import { API, starNum, starStr, relTime, fmtDate, fmtNum, auditTypeLabel, sparkFrom, findMetric } from './data.jsx';
import { T, Card, CardHead, Pill, Skel, Mono, Btn, Ico, openModal, closeModal } from './primitives.jsx';
import { NewPostModal } from './NewPostModal.jsx';
import { NewMediaModal } from './NewMediaModal.jsx';

export function AutopilotView({ lastRefreshed }) {
  const [loading, setLoading] = useState(true);
  const [apData, setApData] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await API.apStatus();
        setApData(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [lastRefreshed]);

  const status = apData?.status || {};
  const calendar = apData?.calendar || [];
  const themeNames = { community_awareness:"Community", clinic_culture:"Clinic Culture", service_spotlight:"Services", wellness_tip:"Wellness Tip", did_you_know:"Did You Know", weekly_reminder:"Weekly Reminder", family_wellness:"Family" };

  return (
    <div style={{ padding: "28px 32px 60px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Status banner */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 20 }}>
          {[0,1,2,3].map(i => <Skel key={i} h={80} />)}
        </div>
      ) : (
        <div style={{ padding: 24, borderRadius: 10, background: T.bgDark, color: T.bg, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 24, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, right: 0, width: 200, height: "100%", background: `radial-gradient(circle at top right, ${T.accent}, transparent 70%)`, opacity: 0.2 }} />
          {[
            { k: "Status", v: status.enabled ? "Running" : "Disabled", tone: status.enabled ? "good" : "warn" },
            { k: "Last run", v: status.lastRun ? relTime(status.lastRun) : "—" },
            { k: "Next run", v: "Tomorrow 09:00" },
            { k: "Uptime", v: status.uptime || "—" }
          ].map((s, i) => (
            <div key={i} style={{ position: "relative", borderLeft: i === 0 ? "none" : "1px solid oklch(0.3 0.01 60)", paddingLeft: i === 0 ? 0 : 20 }}>
              <Mono size={10} color="oklch(0.6 0.01 60)">{s.k}</Mono>
              <div style={{ fontFamily: T.fontDisp, fontSize: 28, marginTop: 6, color: T.bg, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 8 }}>
                {s.tone === "good" && <span style={{ width: 10, height: 10, borderRadius: "50%", background: T.good }} />}
                {s.tone === "warn" && <span style={{ width: 10, height: 10, borderRadius: "50%", background: T.warn }} />}
                {s.v}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Config flags */}
      <Card>
        <CardHead eyebrow="Configuration" title="Feature flags" sub="Control what Autopilot is allowed to do." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 0, border: `1px solid ${T.line}`, borderRadius: 8, overflow: "hidden" }}>
          {[
            { k: "AUTOPILOT_ENABLED", on: status.enabled, desc: "Master kill switch" },
            { k: "AUTOPILOT_DAILY_POST", on: status.dailyPost?.enabled, desc: "Publish one post per day" },
            { k: "AUTOPILOT_AUTO_REPLY", on: status.autoReplies?.enabled, desc: "Reply to safe 4★/5★ reviews" },
            { k: "AUTOPILOT_POST_DRY_RUN", on: false, desc: "Generate but don't publish" }
          ].map((f, i) => (
            <div key={f.k} style={{ padding: 16, borderLeft: i % 2 === 1 ? `1px solid ${T.line}` : "none", borderTop: i >= 2 ? `1px solid ${T.line}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <Mono size={11} color={T.ink}>{f.k}</Mono>
                <div style={{ fontSize: 12, color: T.ink60, marginTop: 3 }}>{f.desc}</div>
              </div>
              <div onClick={() => alert(`Toggling ${f.k}`)} style={{ width: 36, height: 20, borderRadius: 999, background: f.on ? T.good : T.lineStrong, padding: 2, display: "flex", justifyContent: f.on ? "flex-end" : "flex-start", cursor: "pointer" }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: T.bg }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Content calendar detail */}
      <Card>
        <CardHead eyebrow="Content strategy" title="Weekly rotation" sub="Themes cycle each day. Edit here or let Synapse AI adapt based on engagement." right={<Btn size="sm" onClick={() => alert("Customize!")}><Ico name="edit" size={12} /> Customize</Btn>} />
        {loading ? (
          <Skel h={200} />
        ) : calendar.length > 0 ? (
          <div data-keep-grid="7" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
            {calendar.map((d, i) => {
              const dDate = new Date(d.date);
              const today = new Date();
              const isToday = dDate.toDateString() === today.toDateString();
              const dayLabel = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dDate.getDay()];
              const dateNum = dDate.getDate();
              const isDone = dDate < today && !isToday;
              return (
                <div key={i} style={{ padding: 14, borderRadius: 8, background: isToday ? T.ink : T.bgSoft, border: `1px solid ${isToday ? T.ink : T.line}`, color: isToday ? T.bg : T.ink, minHeight: 140, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <Mono size={10} color={isToday ? T.accent : T.ink60}>{dayLabel.toUpperCase()}</Mono>
                    <div style={{ fontFamily: T.fontDisp, fontSize: 22, color: isToday ? T.bg : T.ink }}>{dateNum}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, marginTop: 12, color: isToday ? T.bg : T.ink }}>{themeNames[d.theme] || d.theme}</div>
                  <div style={{ fontSize: 11, color: isToday ? "oklch(0.75 0.01 60)" : T.ink60, marginTop: 4, lineHeight: 1.35 }}>{d.topic || "—"}</div>
                  <div style={{ flex: 1 }} />
                  {isDone ? <Pill tone="good">Shipped</Pill> : isToday ? <Pill tone="accent" dot>Today</Pill> : <Mono size={10}>Pending</Mono>}
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
      const res = await API.call("/api/agent/chat", {
        method: "POST",
        body: JSON.stringify({ message: msg, history: apiHistory }),
        signal: controller.signal,
      });
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
          <Btn size="sm" onClick={() => alert("Drafting all replies!")}><Ico name="sparkle" size={12} /> Draft all replies</Btn>
          <Btn size="sm" tone="solid" onClick={() => alert("Exporting!")}><Ico name="download" size={12} /> Export</Btn>
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
        const data = await API.posts();
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
            const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : 0;
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
                  <Btn size="sm" onClick={() => alert("Viewing post!")}><Ico name="eye" size={12} /> View</Btn>
                </div>
              </Card>
            );
          })}
        </div>
      )}
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
        const data = await API.media();
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

  const photoCount = filteredMedia.filter(m => (m.mediaFormat || "").toUpperCase() === "PHOTO").length;
  const videoCount = filteredMedia.filter(m => (m.mediaFormat || "").toUpperCase() === "VIDEO").length;

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
          {filteredMedia.map((m, i) => {
            const isVideo = (m.mediaFormat || "").toUpperCase() === "VIDEO";
            const hasUrl = m.mediaUrl || m.sourceUrl;
            return (
              <div key={m.mediaId || i} style={{
                aspectRatio: "1",
                background: hasUrl && m.mediaUrl ? `url(${m.mediaUrl})` : `repeating-linear-gradient(${45 + i * 15}deg, oklch(0.92 0.02 ${50 + i * 10}), oklch(0.92 0.02 ${50 + i * 10}) 4px, oklch(0.88 0.02 ${50 + i * 10}) 4px, oklch(0.88 0.02 ${50 + i * 10}) 12px)`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                borderRadius: 8, border: `1px solid ${T.line}`,
                position: "relative", overflow: "hidden"
              }}>
                {isVideo && (
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 40, height: 40, borderRadius: "50%", background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Ico name="play" size={16} color={T.bg} />
                  </div>
                )}
                <div style={{ position: "absolute", bottom: 8, left: 8 }}>
                  <Mono size={9} color="oklch(0.4 0.02 60)">{isVideo ? "[ video ]" : "[ photo ]"}</Mono>
                </div>
              </div>
            );
          })}
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
        const data = await API.auditLog(500);
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
            <Btn size="sm" onClick={() => alert("Filtering!")}><Ico name="filter" size={12} /> Filter</Btn>
            <Btn size="sm" onClick={() => alert("Exporting CSV!")}><Ico name="download" size={12} /> Export CSV</Btn>
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
                  <Mono size={11}>{new Date(l.ts).toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" })}</Mono>
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

export function AnalyticsView({ reviews, searchTerm, lastRefreshed }) {
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
        const data = await API.services();
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
