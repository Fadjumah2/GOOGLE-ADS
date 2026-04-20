// Synapse — Autopilot, Chat, Reviews, Posts, Analytics, Media, Services, Audit views

// ============ MOCK DATA ============
const MOCK = {
  calendar: [
    { day: "Fri", date: "19", theme: "Weekly Reminder", topic: "Book your check-up", done: true, today: false },
    { day: "Sat", date: "20", theme: "Clinic Culture", topic: "Meet our team", done: false, today: true },
    { day: "Sun", date: "21", theme: "Wellness Tip", topic: "Ear care 101", done: false, today: false },
    { day: "Mon", date: "22", theme: "Service Spotlight", topic: "Hearing tests", done: false, today: false },
    { day: "Tue", date: "23", theme: "Did You Know", topic: "Tinnitus facts", done: false, today: false },
    { day: "Wed", date: "24", theme: "Community", topic: "Local health", done: false, today: false },
    { day: "Thu", date: "25", theme: "Family", topic: "Kids' ear health", done: false, today: false }
  ],
  chatLog: [
    { role: "user", msg: "Generate a post about hearing health" },
    { role: "assistant", msg: "Here's a post: 'Taking care of your hearing is crucial...'" },
    { role: "user", msg: "Make it more engaging" },
    { role: "assistant", msg: "Updated: 'Did you know that regular hearing checks...'" }
  ],
  reviews: [
    { id: "1", author: "John M.", rating: 5, text: "Great service, very professional team.", date: "2026-04-18", status: "answered" },
    { id: "2", author: "Mary K.", rating: 4, text: "Good experience, friendly staff.", date: "2026-04-17", status: "unanswered" },
    { id: "3", author: "James L.", rating: 3, text: "Average, could improve waiting time.", date: "2026-04-16", status: "unanswered" },
    { id: "4", author: "Sarah P.", rating: 5, text: "Excellent doctor, very knowledgeable.", date: "2026-04-15", status: "answered" },
    { id: "5", author: "Mike T.", rating: 2, text: "Had issues with the appointment system.", date: "2026-04-14", status: "unanswered" }
  ],
  posts: [
    { id: "1", text: "Welcome to Eritage ENT Care! We're here to help with all your ear, nose, and throat needs.", date: "2026-04-19", likes: 42 },
    { id: "2", text: "Tip: Protect your ears from loud noises. Use ear protection when needed.", date: "2026-04-17", likes: 28 },
    { id: "3", text: "Meet our experienced team of ENT specialists dedicated to your health.", date: "2026-04-15", likes: 35 }
  ],
  auditLog: [
    { time: "09:00", action: "autopilot.post.published", detail: "Daily post published", status: "success" },
    { time: "08:55", action: "autopilot.reply.drafted", detail: "Review reply drafted (pending review)", status: "pending" },
    { time: "08:30", action: "autopilot.post.generated", detail: "Post generated: 'Hearing Health Month'", status: "success" },
    { time: "07:15", action: "autopilot.scheduled", detail: "Daily cycle started", status: "info" }
  ],
  metrics: [
    { metric: "Profile Views", value: 1247, trend: 12 },
    { metric: "Direction Requests", value: 89, trend: 8 },
    { metric: "Calls", value: 34, trend: 5 },
    { metric: "Website Clicks", value: 156, trend: 18 }
  ],
  services: [
    { id: "1", name: "General Consultation", description: "Initial ear, nose, and throat examination" },
    { id: "2", name: "Hearing Test", description: "Comprehensive hearing assessment and testing" },
    { id: "3", name: "ENT Surgery", description: "Surgical procedures for ENT conditions" },
    { id: "4", name: "Allergy Testing", description: "Allergy identification and treatment" }
  ]
};

// ============ AUTOPILOT ============
function AutopilotView() {
  return (
    <div style={{ padding: "28px 32px 60px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Status banner */}
      <div style={{
        padding: 24, borderRadius: 10,
        background: T.bgDark, color: T.bg,
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 24,
        position: "relative", overflow: "hidden"
      }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 200, height: "100%",
          background: `radial-gradient(circle at top right, ${T.accent}, transparent 70%)`, opacity: 0.2 }} />
        {[
          { k: "Status", v: "Running", tone: "good" },
          { k: "Last run", v: "09:00 EAT" },
          { k: "Next run", v: "Tomorrow 09:00" },
          { k: "Uptime", v: "47 days" }
        ].map((s, i) => (
          <div key={i} style={{ position: "relative", borderLeft: i === 0 ? "none" : "1px solid oklch(0.3 0.01 60)", paddingLeft: i === 0 ? 0 : 20 }}>
            <Mono size={10} color="oklch(0.6 0.01 60)">{s.k}</Mono>
            <div style={{ fontFamily: T.fontDisp, fontSize: 28, marginTop: 6, color: T.bg, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 8 }}>
              {s.tone === "good" && <span style={{ width: 10, height: 10, borderRadius: "50%", background: T.good }} />}
              {s.v}
            </div>
          </div>
        ))}
      </div>

      {/* Config flags */}
      <Card>
        <CardHead eyebrow="Configuration" title="Feature flags" sub="Control what Autopilot is allowed to do." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 0, border: `1px solid ${T.line}`, borderRadius: 8, overflow: "hidden" }}>
          {[
            { k: "AUTOPILOT_ENABLED", on: true, desc: "Master kill switch" },
            { k: "AUTOPILOT_DAILY_POST", on: true, desc: "Publish one post per day" },
            { k: "AUTOPILOT_AUTO_REPLY", on: true, desc: "Reply to safe 4★/5★ reviews" },
            { k: "AUTOPILOT_POST_DRY_RUN", on: false, desc: "Generate but don't publish" }
          ].map((f, i) => (
            <div key={f.k} style={{
              padding: 16,
              borderLeft: i % 2 === 1 ? `1px solid ${T.line}` : "none",
              borderTop: i >= 2 ? `1px solid ${T.line}` : "none",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <div>
                <Mono size={11} color={T.ink}>{f.k}</Mono>
                <div style={{ fontSize: 12, color: T.ink60, marginTop: 3 }}>{f.desc}</div>
              </div>
              <div style={{
                width: 36, height: 20, borderRadius: 999,
                background: f.on ? T.good : T.lineStrong,
                padding: 2, display: "flex",
                justifyContent: f.on ? "flex-end" : "flex-start",
                cursor: "pointer"
              }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: T.bg }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Content calendar detail */}
      <Card>
        <CardHead eyebrow="Content strategy" title="Weekly rotation" sub="Themes cycle each day. Edit here or let Synapse AI adapt based on engagement." right={<Btn size="sm"><Ico name="edit" size={12} /> Customize</Btn>} />
        <div data-keep-grid="7" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
          {MOCK.calendar.map((d, i) => (
            <div key={i} style={{
              padding: 14, borderRadius: 8,
              background: d.today ? T.ink : T.bgSoft,
              border: `1px solid ${d.today ? T.ink : T.line}`,
              color: d.today ? T.bg : T.ink,
              minHeight: 140, display: "flex", flexDirection: "column"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <Mono size={10} color={d.today ? T.accent : T.ink60}>{d.day.toUpperCase()}</Mono>
                <div style={{ fontFamily: T.fontDisp, fontSize: 22, color: d.today ? T.bg : T.ink }}>{d.date}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, marginTop: 12, color: d.today ? T.bg : T.ink }}>{d.theme}</div>
              <div style={{ fontSize: 11, color: d.today ? "oklch(0.75 0.01 60)" : T.ink60, marginTop: 4, lineHeight: 1.35 }}>{d.topic}</div>
              <div style={{ flex: 1 }} />
              {d.done ? <Pill tone="good">Shipped</Pill> : d.today ? <Pill tone="accent" dot>Today</Pill> : <Mono size={10}>Pending</Mono>}
            </div>
          ))}
        </div>
      </Card>

      {/* Policy guard */}
      <Card>
        <CardHead eyebrow="Policy guard" title="What Synapse blocked recently" sub="Every draft is scanned. Three strikes, nothing ships." />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { t: "Refers to us as the '#1 ENT clinic in Uganda' and gives our direct line: 0700 000 000.", r: "Superlative · Phone number" },
            { t: "Visit drbookings.com to schedule.", r: "Foreign URL" },
            { t: "We guarantee your tinnitus will be cured.", r: "Medical claim · guarantee" },
            { t: "Best ENT service in Entebbe! 🔥💯 #ent", r: "Emojis · Hashtag · Superlative" }
          ].map((b, i) => (
            <div key={i} style={{ padding: 14, border: `1px solid ${T.line}`, borderLeft: `3px solid ${T.bad}`, borderRadius: 6, background: T.bgElev }}>
              <Mono size={10} color={T.bad}>REJECTED · draft {i + 1}</Mono>
              <div style={{ fontSize: 13, marginTop: 6, color: T.ink80, textDecoration: "line-through", textDecorationColor: `${T.bad}60` }}>{b.t}</div>
              <Mono size={11} style={{ marginTop: 6, display: "block" }} color={T.ink60}>→ {b.r}</Mono>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============ CHAT ============
function ChatView() {
  const [input, setInput] = useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 82px)" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ textAlign: "center", padding: "20px 0 30px" }}>
            <div style={{ fontFamily: T.fontDisp, fontSize: 36, letterSpacing: "-0.02em" }}>How can I help today?</div>
            <div style={{ fontSize: 14, color: T.ink70, marginTop: 8 }}>Connected to 14 tools across your Google Business Profile.</div>
          </div>

          {MOCK.chatLog.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 12, flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                background: m.role === "user" ? T.bgSoft : T.ink,
                border: m.role === "user" ? `1px solid ${T.line}` : "none",
                color: m.role === "user" ? T.ink : T.accent,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: T.fontMono, fontSize: 11, fontWeight: 500
              }}>{m.role === "user" ? "H" : <Ico name="ai" size={13} />}</div>

              <div style={{ maxWidth: "80%" }}>
                <div style={{
                  padding: "12px 16px", borderRadius: 10,
                  background: m.role === "user" ? T.bgSoft : T.bgElev,
                  border: `1px solid ${T.line}`,
                  fontSize: 14, lineHeight: 1.55
                }}>
                  {m.text}
                </div>
                {m.attachment && (
                  <div style={{ marginTop: 8, padding: 14, border: `1px dashed ${T.lineStrong}`, borderRadius: 8, background: T.bgSoft }}>
                    <Mono size={10} color={T.accent}>DRAFT · post preview</Mono>
                    <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.55, color: T.ink80 }}>{m.attachment}</div>
                  </div>
                )}
                {m.tools && (
                  <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {m.tools.map(t => (
                      <Mono key={t} size={10}>⟶ {t}()</Mono>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: 20, borderTop: `1px solid ${T.line}`, background: T.bg }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            {["Show unanswered reviews", "Post about weekend hours", "Which day is my worst?", "Draft replies for today"].map(c => (
              <button key={c} onClick={() => setInput(c)} style={{
                padding: "6px 12px", borderRadius: 999,
                border: `1px solid ${T.line}`, background: T.bgElev,
                fontSize: 12, color: T.ink70, cursor: "pointer", fontFamily: T.fontSans
              }}>{c}</button>
            ))}
          </div>
          <div style={{
            display: "flex", alignItems: "flex-end", gap: 10,
            padding: 12, border: `1px solid ${T.lineStrong}`, borderRadius: 10,
            background: T.bgElev
          }}>
            <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Ask Synapse anything about your business…" rows={1} style={{
              flex: 1, border: "none", outline: "none", resize: "none",
              fontFamily: T.fontSans, fontSize: 14, lineHeight: 1.5,
              background: "transparent", color: T.ink, padding: 4
            }} />
            <button style={{
              width: 32, height: 32, borderRadius: 6, background: T.ink,
              color: T.bg, border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}><Ico name="send" size={14} color={T.bg} /></button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <Mono size={10}>14 tools · Gemini 1.5 Pro · audit-logged</Mono>
            <Mono size={10}>⏎ send · ⇧⏎ newline</Mono>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ REVIEWS ============
function ReviewsView() {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? MOCK.reviews : MOCK.reviews.filter(r => r.status === filter);
  return (
    <div style={{ padding: "28px 32px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4, padding: 3, background: T.bgSoft, borderRadius: 6, border: `1px solid ${T.line}` }}>
          {[
            { k: "all", l: `All · ${MOCK.reviews.length}` },
            { k: "auto-replied", l: "Replied · 3" },
            { k: "drafted", l: "Drafted · 1" },
            { k: "flagged", l: "Flagged · 1" }
          ].map(t => (
            <button key={t.k} onClick={() => setFilter(t.k)} style={{
              padding: "6px 12px", border: "none", borderRadius: 4,
              background: filter === t.k ? T.bgElev : "transparent",
              fontFamily: T.fontMono, fontSize: 11, letterSpacing: "0.04em",
              color: filter === t.k ? T.ink : T.ink70, cursor: "pointer",
              boxShadow: filter === t.k ? "0 1px 2px rgba(0,0,0,0.04)" : "none"
            }}>{t.l}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn size="sm"><Ico name="sparkle" size={12} /> Draft all replies</Btn>
          <Btn size="sm" tone="solid"><Ico name="download" size={12} /> Export</Btn>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map(r => (
          <Card key={r.id}>
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: T.bgSoft, border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.fontMono, fontSize: 12 }}>{r.initials}</div>
              <div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{r.name}</span>
                  <span style={{ color: T.warn, fontSize: 13 }}>{"★".repeat(r.stars)}<span style={{ color: T.line }}>{"★".repeat(5 - r.stars)}</span></span>
                  <Mono size={11}>{r.time} ago</Mono>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: T.ink80 }}>{r.text}</div>
                {r.reply && (
                  <div style={{ marginTop: 12, padding: 14, background: T.bgSoft, borderRadius: 6, borderLeft: `3px solid ${T.good}` }}>
                    <Mono size={10} color={T.good}>AUTO-REPLIED · 2h ago</Mono>
                    <div style={{ fontSize: 13, marginTop: 4, color: T.ink80, lineHeight: 1.55 }}>{r.reply}</div>
                  </div>
                )}
                {r.draft && (
                  <div style={{ marginTop: 12, padding: 14, background: T.accentSoft, borderRadius: 6, borderLeft: `3px solid ${T.accent}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <Mono size={10} color={T.accent}>AI DRAFT · awaiting approval</Mono>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn size="sm" tone="accent"><Ico name="check" size={11} /> Approve</Btn>
                        <Btn size="sm"><Ico name="edit" size={11} /> Edit</Btn>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: T.ink80, lineHeight: 1.55 }}>{r.draft}</div>
                  </div>
                )}
                {r.reasons && (
                  <div style={{ marginTop: 12, padding: 14, background: T.badSoft, borderRadius: 6, borderLeft: `3px solid ${T.bad}` }}>
                    <Mono size={10} color={T.bad}>FLAGGED · human review required</Mono>
                    <div style={{ fontSize: 13, marginTop: 6, color: T.ink80 }}>
                      Reasons: {r.reasons.join(" · ")}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      <Btn size="sm" tone="solid">Handle manually</Btn>
                      <Btn size="sm">Dismiss</Btn>
                    </div>
                  </div>
                )}
              </div>
              <Pill tone={r.status === "auto-replied" ? "good" : r.status === "flagged" ? "bad" : "accent"}>{r.status.replace("-", " ")}</Pill>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============ POSTS ============
function PostsView() {
  return (
    <div style={{ padding: "28px 32px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <Mono size={11}>{MOCK.posts.length} posts · last 30 days</Mono>
        <Btn tone="solid" size="sm"><Ico name="plus" size={12} /> New post</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        {MOCK.posts.map(p => (
          <Card key={p.id}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <Pill tone="good" dot>Live</Pill>
              <Mono size={11}>{p.date}</Mono>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: T.ink80, minHeight: 80 }}>{p.text}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
              <div style={{ display: "flex", gap: 20 }}>
                <div><Mono size={10}>Views</Mono><div style={{ fontFamily: T.fontDisp, fontSize: 20, marginTop: 2 }}>{p.views}</div></div>
                <div><Mono size={10}>Clicks</Mono><div style={{ fontFamily: T.fontDisp, fontSize: 20, marginTop: 2 }}>{p.clicks}</div></div>
                <div><Mono size={10}>CTR</Mono><div style={{ fontFamily: T.fontDisp, fontSize: 20, marginTop: 2 }}>{((p.clicks / p.views) * 100).toFixed(1)}%</div></div>
              </div>
              <Btn size="sm"><Ico name="eye" size={12} /> View</Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============ AUDIT LOG ============
function AuditView() {
  return (
    <div style={{ padding: "28px 32px 60px" }}>
      <Card flush>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <Mono size={11}>{MOCK.auditLog.length} entries · live tail</Mono>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.good }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn size="sm"><Ico name="filter" size={12} /> Filter</Btn>
            <Btn size="sm"><Ico name="download" size={12} /> Export CSV</Btn>
          </div>
        </div>
        <div>
          {MOCK.auditLog.map((l, i) => (
            <div key={i} style={{
              padding: "12px 20px",
              display: "grid", gridTemplateColumns: "80px 180px 90px 1fr",
              gap: 16, alignItems: "center",
              borderTop: i > 0 ? `1px solid ${T.line}` : "none",
              background: i % 2 === 0 ? "transparent" : T.bgSoft
            }}>
              <Mono size={11}>{l.ts}</Mono>
              <Mono size={11} color={T.ink}>{l.type}</Mono>
              <Pill tone={l.status === "ok" ? "good" : l.status === "warn" ? "warn" : "neutral"}>{l.status}</Pill>
              <span style={{ fontSize: 13, color: T.ink80 }}>{l.msg}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============ ANALYTICS ============
function AnalyticsView() {
  return (
    <div style={{ padding: "28px 32px 60px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div data-keep-grid="4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, border: `1px solid ${T.line}`, borderRadius: 10, background: T.bgElev }}>
        {MOCK.metrics.map((m, i) => (
          <div key={i} style={{ padding: 20, borderLeft: i === 0 ? "none" : `1px solid ${T.line}` }}>
            <Label>{m.label}</Label>
            <div style={{ fontFamily: T.fontDisp, fontSize: 44, letterSpacing: "-0.02em", marginTop: 10, lineHeight: 1 }}>{m.value}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <Mono size={11} color={T.good}>{m.delta} vs prev</Mono>
              <Sparkline data={m.spark} w={60} h={20} />
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardHead eyebrow="90 days" title="Profile activity trend" />
        <ChartArea h={300} />
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card>
          <CardHead eyebrow="Rating" title="Review distribution" />
          {[5, 4, 3, 2, 1].map(s => {
            const pct = [72, 18, 6, 3, 1][5 - s];
            return (
              <div key={s} style={{ display: "grid", gridTemplateColumns: "40px 1fr 60px", gap: 12, alignItems: "center", marginBottom: 10 }}>
                <Mono size={11}>{s} ★</Mono>
                <div style={{ height: 8, background: T.bgSoft, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: s >= 4 ? T.good : s === 3 ? T.warn : T.bad }} />
                </div>
                <Mono size={11} style={{ textAlign: "right" }}>{pct}%</Mono>
              </div>
            );
          })}
        </Card>
        <Card>
          <CardHead eyebrow="Response time" title="Reply performance" />
          <div style={{ fontFamily: T.fontDisp, fontSize: 56, letterSpacing: "-0.03em", lineHeight: 1 }}>47<span style={{ fontSize: 24, color: T.ink60 }}> min</span></div>
          <div style={{ fontSize: 13, color: T.ink70, marginTop: 6 }}>Median time to reply · last 30 days</div>
          <div style={{ marginTop: 20, padding: 12, background: T.goodSoft, borderRadius: 6 }}>
            <Mono size={10} color={T.good}>94% OF REVIEWS ANSWERED</Mono>
            <div style={{ fontSize: 12, marginTop: 4, color: T.ink80 }}>Up from 23% before Autopilot.</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ============ SERVICES ============
function ServicesView() {
  return (
    <div style={{ padding: "28px 32px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <Mono size={11}>{MOCK.services.length} services listed on Google</Mono>
        <Btn size="sm" tone="solid"><Ico name="plus" size={12} /> Add service</Btn>
      </div>
      <Card flush>
        {MOCK.services.map((s, i) => (
          <div key={i} style={{
            padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 120px 100px 40px",
            gap: 16, alignItems: "center",
            borderTop: i > 0 ? `1px solid ${T.line}` : "none"
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</div>
              <Mono size={10} style={{ marginTop: 2 }}>ID · svc_{(i + 1).toString().padStart(3, "0")}</Mono>
            </div>
            <Mono size={12} color={T.ink}>{s.price}</Mono>
            <Mono size={12}>{s.duration}</Mono>
            <Ico name="edit" size={14} color={T.ink60} />
          </div>
        ))}
      </Card>
    </div>
  );
}

// ============ MEDIA ============
function MediaView() {
  return (
    <div style={{ padding: "28px 32px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <Mono size={11}>24 photos · 2 videos</Mono>
        <Btn size="sm" tone="solid"><Ico name="plus" size={12} /> Upload media</Btn>
      </div>
      <div data-keep-grid="4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{
            aspectRatio: "1",
            background: `repeating-linear-gradient(${45 + i * 15}deg, oklch(0.92 0.02 ${50 + i * 10}), oklch(0.92 0.02 ${50 + i * 10}) 4px, oklch(0.88 0.02 ${50 + i * 10}) 4px, oklch(0.88 0.02 ${50 + i * 10}) 12px)`,
            borderRadius: 8, border: `1px solid ${T.line}`,
            position: "relative", overflow: "hidden"
          }}>
            <div style={{ position: "absolute", bottom: 8, left: 8 }}>
              <Mono size={9} color="oklch(0.4 0.02 60)">[ photo {i + 1} ]</Mono>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.AutopilotView = AutopilotView;
window.ChatView = ChatView;
window.ReviewsView = ReviewsView;
window.PostsView = PostsView;
window.AuditView = AuditView;
window.AnalyticsView = AnalyticsView;
window.ServicesView = ServicesView;
window.MediaView = MediaView;
