const { useState, useEffect, useRef } = React;

// ============ TWEAKS ============
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "fontPair": "instrument-geist",
  "accent": "terracotta"
}/*EDITMODE-END*/;

const FONT_PAIRS = {
  "instrument-geist": {
    label: "Instrument Serif × Geist",
    display: "'Instrument Serif', serif",
    body: "'Geist', system-ui, sans-serif",
    mono: "'Geist Mono', ui-monospace, monospace",
    import: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"
  },
  "newsreader-geist": {
    label: "Newsreader × Geist Mono",
    display: "'Newsreader', serif",
    body: "'Geist Mono', ui-monospace, monospace",
    mono: "'Geist Mono', ui-monospace, monospace",
    import: "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400&family=Geist+Mono:wght@400;500&display=swap"
  },
  "source-space": {
    label: "Source Serif × Space Grotesk",
    display: "'Source Serif 4', serif",
    body: "'Space Grotesk', system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
    import: "https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;0,8..60,700;1,8..60,400&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
  }
};

const ACCENTS = {
  terracotta: { name: "Terracotta", color: "oklch(0.62 0.14 40)", soft: "oklch(0.94 0.04 60)", ink: "oklch(0.32 0.09 40)" },
  ink: { name: "Deep Ink", color: "oklch(0.35 0.08 260)", soft: "oklch(0.94 0.02 260)", ink: "oklch(0.22 0.06 260)" },
  forest: { name: "Forest", color: "oklch(0.45 0.09 150)", soft: "oklch(0.94 0.03 140)", ink: "oklch(0.28 0.06 150)" },
  plum: { name: "Plum", color: "oklch(0.42 0.12 340)", soft: "oklch(0.94 0.03 340)", ink: "oklch(0.28 0.08 340)" }
};

// ============ HELPERS ============
const Eyebrow = ({ children }) => (
  <div style={{
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "var(--ink-60)",
    display: "flex", alignItems: "center", gap: 8
  }}>
    <span style={{ width: 6, height: 6, background: "var(--accent)", borderRadius: 1, display: "inline-block" }} />
    {children}
  </div>
);

const StripePlaceholder = ({ label, h = 200, tone = "warm" }) => (
  <div style={{
    height: h,
    borderRadius: 4,
    background: tone === "warm"
      ? "repeating-linear-gradient(135deg, oklch(0.92 0.02 70), oklch(0.92 0.02 70) 2px, oklch(0.88 0.02 70) 2px, oklch(0.88 0.02 70) 10px)"
      : "repeating-linear-gradient(135deg, oklch(0.2 0.01 60), oklch(0.2 0.01 60) 2px, oklch(0.25 0.01 60) 2px, oklch(0.25 0.01 60) 10px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
    color: tone === "warm" ? "oklch(0.45 0.02 60)" : "oklch(0.8 0.01 60)",
    border: "1px solid var(--line)"
  }}>
    [ {label} ]
  </div>
);

// ============ NAV ============
const Nav = () => (
  <nav style={{
    position: "sticky", top: 0, zIndex: 50,
    background: "color-mix(in oklch, var(--bg) 85%, transparent)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid var(--line)"
  }}>
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "18px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: "var(--ink-90)",
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative"
        }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", border: `1.5px solid var(--accent)` }} />
          <div style={{ position: "absolute", width: 4, height: 4, borderRadius: "50%", background: "var(--accent)" }} />
        </div>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.01em" }}>Synapse</span>
      </div>
      <div style={{ display: "flex", gap: 32, alignItems: "center", fontSize: 14 }}>
        <a href="#features" style={linkStyle}>Features</a>
        <a href="#how" style={linkStyle}>How it works</a>
        <a href="#safety" style={linkStyle}>Policy guard</a>
        <a href="#pricing" style={linkStyle}>Pricing</a>
        <a href="#cta" style={{ ...linkStyle, padding: "8px 16px", background: "var(--ink-90)", color: "var(--bg)", borderRadius: 999 }}>Contact sales →</a>
      </div>
    </div>
  </nav>
);

const linkStyle = { color: "var(--ink-80)", textDecoration: "none", fontFamily: "var(--font-body)" };

// ============ HERO ============
const Hero = () => (
  <section style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 32px 60px", position: "relative" }}>
    <Eyebrow>Autopilot for Google Business Profile</Eyebrow>
    <h1 style={{
      fontFamily: "var(--font-display)",
      fontSize: "clamp(56px, 8vw, 104px)",
      lineHeight: 0.98,
      letterSpacing: "-0.03em",
      fontWeight: 400,
      margin: "28px 0 0",
      maxWidth: 1000
    }}>
      More customers.<br />
      <span style={{ fontStyle: "italic", color: "var(--accent)" }}>Less busywork.</span>
    </h1>
    <p style={{
      fontSize: 20, lineHeight: 1.5, color: "var(--ink-70)",
      maxWidth: 560, marginTop: 32, fontFamily: "var(--font-body)"
    }}>
      Synapse runs your Google Business Profile on autopilot — drafting posts, replying to reviews, and answering questions, all guarded by policy so nothing risky ships.
    </p>
    <div style={{ display: "flex", gap: 12, marginTop: 40, alignItems: "center" }}>
      <a href="#cta" style={{
        padding: "16px 26px",
        background: "var(--ink-90)",
        color: "var(--bg)",
        borderRadius: 999,
        fontFamily: "var(--font-body)",
        fontSize: 15, fontWeight: 500,
        textDecoration: "none",
        display: "inline-flex", alignItems: "center", gap: 8
      }}>Contact sales <span>→</span></a>
      <a href="#how" style={{
        padding: "16px 26px",
        border: "1px solid var(--line-strong)",
        borderRadius: 999,
        fontFamily: "var(--font-body)",
        fontSize: 15, fontWeight: 500,
        color: "var(--ink-90)",
        textDecoration: "none"
      }}>See how it works</a>
    </div>

    {/* Trust row */}
    <div style={{ marginTop: 80, display: "flex", gap: 48, alignItems: "center", flexWrap: "wrap", opacity: 0.75 }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--ink-60)" }}>Used by local businesses in</span>
      {["Entebbe", "Kampala", "Nairobi", "Lagos", "Accra"].map(c => (
        <span key={c} style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: "-0.01em" }}>{c}</span>
      ))}
    </div>
  </section>
);

// ============ METRICS ============
const Metrics = () => {
  const stats = [
    { n: "4.2×", l: "more profile views after 60 days" },
    { n: "94%", l: "reviews answered within the hour" },
    { n: "365", l: "posts per year — without lifting a finger" },
    { n: "0", l: "policy violations across thousands of drafts" }
  ];
  return (
    <section style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", background: "var(--bg-soft)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 32px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            padding: "0 32px",
            borderLeft: i === 0 ? "none" : "1px solid var(--line)"
          }}>
            <div style={{
              fontFamily: "var(--font-display)",
              fontSize: 80, lineHeight: 0.9, letterSpacing: "-0.03em", fontWeight: 400,
              color: "var(--ink-90)"
            }}>{s.n}</div>
            <div style={{ marginTop: 16, fontSize: 14, color: "var(--ink-70)", fontFamily: "var(--font-body)", maxWidth: 200 }}>
              {s.l}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

// ============ DASHBOARD PREVIEW ============
const DashboardMock = () => (
  <div style={{
    borderRadius: 14,
    overflow: "hidden",
    border: "1px solid var(--line-strong)",
    background: "var(--bg)",
    boxShadow: "0 40px 80px -20px oklch(0.3 0.05 60 / 0.15), 0 8px 24px -8px oklch(0.3 0.05 60 / 0.1)"
  }}>
    {/* window chrome */}
    <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8, background: "var(--bg-soft)" }}>
      <div style={{ display: "flex", gap: 6 }}>
        {["#E8C5C0", "#E8DCC0", "#C8D8C0"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
      </div>
      <div style={{ flex: 1, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-60)" }}>
        synapse.app / dashboard
      </div>
    </div>

    {/* dashboard body */}
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", minHeight: 540 }}>
      {/* sidebar */}
      <div style={{ borderRight: "1px solid var(--line)", padding: "20px 12px", background: "var(--bg-soft)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-60)", padding: "0 8px 10px" }}>Workspace</div>
        {[
          { l: "Autopilot", active: true, badge: "ON" },
          { l: "Reviews", n: "3" },
          { l: "Posts" },
          { l: "Questions", n: "1" },
          { l: "Services" },
          { l: "Media" },
          { l: "Insights" },
        ].map((it, i) => (
          <div key={i} style={{
            padding: "8px 10px", borderRadius: 6, fontSize: 13,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: it.active ? "var(--bg)" : "transparent",
            border: it.active ? "1px solid var(--line)" : "1px solid transparent",
            color: it.active ? "var(--ink-90)" : "var(--ink-70)",
            fontWeight: it.active ? 500 : 400,
            fontFamily: "var(--font-body)",
            marginBottom: 2
          }}>
            <span>{it.l}</span>
            {it.badge && <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--accent)", background: "var(--accent-soft)", padding: "2px 6px", borderRadius: 3 }}>{it.badge}</span>}
            {it.n && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-60)" }}>{it.n}</span>}
          </div>
        ))}
      </div>

      {/* main */}
      <div style={{ padding: "28px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-60)" }}>Autopilot</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: "-0.02em", marginTop: 4 }}>Today's plan</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{
              padding: "6px 12px", borderRadius: 999,
              background: "oklch(0.95 0.04 150)",
              color: "oklch(0.35 0.09 150)",
              fontFamily: "var(--font-mono)", fontSize: 11,
              display: "flex", alignItems: "center", gap: 6
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "oklch(0.55 0.15 150)" }} />
              Running
            </div>
          </div>
        </div>

        {/* today's post card */}
        <div style={{ padding: 20, border: "1px solid var(--line)", borderRadius: 10, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)" }}>09:00 · Daily post</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, marginTop: 4 }}>Theme: <span style={{ fontStyle: "italic" }}>Patient education</span></div>
            </div>
            <button style={{ padding: "6px 12px", border: "1px solid var(--line-strong)", borderRadius: 6, fontSize: 12, background: "var(--bg)", fontFamily: "var(--font-body)", cursor: "pointer" }}>Preview</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-80)", fontFamily: "var(--font-body)" }}>
            Hearing changes often creep up gradually. If you've been turning up the TV or asking people to repeat themselves, a straightforward audiology check can clarify what's going on — no referral needed.
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            {["Policy: clean", "Length: 242", "Links: 0", "Ready"].map(t => (
              <div key={t} style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "3px 8px", background: "var(--bg-soft)", border: "1px solid var(--line)", borderRadius: 4, color: "var(--ink-70)" }}>{t}</div>
            ))}
          </div>
        </div>

        {/* review queue */}
        <div style={{ border: "1px solid var(--line)", borderRadius: 10 }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-60)" }}>
            <span>Review queue</span><span>3 pending</span>
          </div>
          {[
            { stars: 5, name: "Patricia M.", text: "Dr. Namwase was so patient with my daughter…", action: "Auto-reply drafted", tone: "safe" },
            { stars: 4, name: "Robert K.", text: "Clean clinic, short wait times. Recommend.", action: "Auto-reply drafted", tone: "safe" },
            { stars: 2, name: "Anonymous", text: "Billing was confusing and I felt rushed…", action: "Flagged for human", tone: "flag" },
          ].map((r, i) => (
            <div key={i} style={{ padding: "14px 16px", borderTop: i === 0 ? "none" : "1px solid var(--line)", display: "grid", gridTemplateColumns: "80px 1fr 140px", gap: 16, alignItems: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-70)" }}>
                {"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-80)", fontFamily: "var(--font-body)" }}>
                <span style={{ fontWeight: 500, color: "var(--ink-90)" }}>{r.name}</span> — <span style={{ fontStyle: "italic" }}>{r.text}</span>
              </div>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em",
                textAlign: "right",
                color: r.tone === "safe" ? "oklch(0.45 0.12 150)" : "oklch(0.55 0.14 40)"
              }}>
                {r.action}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const DashboardSection = () => (
  <section style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 32px" }} id="dashboard">
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 80, marginBottom: 48, alignItems: "flex-end" }}>
      <div>
        <Eyebrow>The dashboard</Eyebrow>
        <h2 style={sectionH}>One place to watch your business run itself.</h2>
      </div>
      <p style={{ fontSize: 17, lineHeight: 1.55, color: "var(--ink-70)", fontFamily: "var(--font-body)" }}>
        See what Synapse is posting today, which reviews are being answered, what's been flagged for you, and how it's all moving the needle — all in one calm, unhurried workspace.
      </p>
    </div>
    <DashboardMock />
  </section>
);

// ============ AI CHAT ============
const ChatShowcase = () => {
  const messages = [
    { role: "user", text: "How many 5-star reviews came in this month?" },
    { role: "agent", text: "14 five-star reviews this month, up 27% from last month. 12 have been auto-replied; 2 are drafted and waiting on your approval.", tools: ["fetchReviews", "getInsights"] },
    { role: "user", text: "Draft a post about our new paediatric audiology service." },
    { role: "agent", text: "Drafted. 218 characters, no medical claims, policy-clean. Scheduled for 09:00 tomorrow unless you'd like to edit.", tools: ["createPost", "policyGuard"] }
  ];

  return (
    <section style={{ background: "var(--ink-90)", color: "var(--bg)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
          <div>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
              color: "var(--accent)", display: "flex", alignItems: "center", gap: 8
            }}>
              <span style={{ width: 6, height: 6, background: "var(--accent)", borderRadius: 1 }} />
              Conversational agent
            </div>
            <h2 style={{ ...sectionH, color: "var(--bg)", marginTop: 24 }}>Just ask. It'll handle the rest.</h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: "oklch(0.85 0.01 60)", marginTop: 24, fontFamily: "var(--font-body)" }}>
              A Gemini-powered agent with fourteen tools wired directly into your profile. Ask it anything — from "what's my rating trend?" to "reply to the last three reviews" — and it gets done, with an audit trail you can read any time.
            </p>
            <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["fetchReviews", "createPost", "replyToReview", "getInsights", "updateProfile", "listMedia", "fetchQuestions", "uploadMedia", "+6 more"].map(t => (
                <span key={t} style={{
                  fontFamily: "var(--font-mono)", fontSize: 11,
                  padding: "4px 10px",
                  border: "1px solid oklch(0.35 0.01 60)",
                  borderRadius: 4,
                  color: "oklch(0.8 0.01 60)"
                }}>{t}</span>
              ))}
            </div>
          </div>

          <div style={{
            borderRadius: 12,
            background: "oklch(0.22 0.01 60)",
            border: "1px solid oklch(0.3 0.01 60)",
            padding: 24,
            display: "flex", flexDirection: "column", gap: 16
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "88%",
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: m.role === "user" ? "oklch(0.3 0.01 60)" : "var(--accent)",
                  color: m.role === "user" ? "var(--bg)" : "oklch(0.15 0.02 40)",
                  fontSize: 14, lineHeight: 1.5, fontFamily: "var(--font-body)"
                }}>
                  {m.text}
                </div>
                {m.tools && (
                  <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                    {m.tools.map(t => (
                      <span key={t} style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "oklch(0.65 0.01 60)" }}>⟶ {t}()</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div style={{ borderTop: "1px solid oklch(0.3 0.01 60)", paddingTop: 14, marginTop: 6, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 12, color: "oklch(0.6 0.01 60)" }}>
                Ask Synapse anything<span style={{ opacity: 0.6, marginLeft: 2 }}>▍</span>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "oklch(0.5 0.01 60)" }}>⌘ ↵</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ============ POLICY GUARD ============
const PolicyGuard = () => {
  const blocks = [
    { text: "We guarantee the best ENT care in Entebbe.", reason: "Medical claim · “guarantee”, “best”" },
    { text: "Visit drsomewhereelse.com/book", reason: "Foreign URL" },
    { text: "Call us on 0700 000 000", reason: "Phone number" },
    { text: "#1 clinic 💯🔥 #ent", reason: "Hashtags + emojis + superlative" },
    { text: "We'll diagnose your condition by phone.", reason: "Medical claim · “diagnose”" },
  ];
  const safe = "Wax buildup can make ears feel full or muffled. Our team offers gentle, in-office removal — book a slot that works for you.";

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "120px 32px" }} id="safety">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80 }}>
        <div>
          <Eyebrow>Policy guard</Eyebrow>
          <h2 style={sectionH}>It knows what it's not allowed to say.</h2>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: "var(--ink-70)", marginTop: 24, fontFamily: "var(--font-body)" }}>
            Every draft runs through a policy engine before it reaches Google. Medical claims, phone numbers, foreign links, emojis, superlatives, hashtags — all blocked before they ship. If three drafts in a row fail, Synapse posts nothing and logs it.
          </p>
          <div style={{ marginTop: 32, padding: 20, border: "1px solid var(--line)", borderRadius: 10, background: "var(--bg-soft)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "oklch(0.45 0.12 150)" }}>✓ Passes</div>
            <div style={{ fontSize: 14, lineHeight: 1.55, marginTop: 8, fontFamily: "var(--font-body)" }}>{safe}</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {blocks.map((b, i) => (
            <div key={i} style={{
              padding: 16,
              border: "1px solid var(--line)",
              borderLeft: "3px solid oklch(0.6 0.15 30)",
              borderRadius: 6,
              background: "var(--bg)",
              position: "relative"
            }}>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
                color: "oklch(0.55 0.15 30)"
              }}>Rejected</div>
              <div style={{ fontSize: 14, marginTop: 6, color: "var(--ink-80)", fontFamily: "var(--font-body)", textDecoration: "line-through", textDecorationColor: "oklch(0.6 0.15 30 / 0.6)", textDecorationThickness: 1 }}>
                {b.text}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-60)", marginTop: 6 }}>
                → {b.reason}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============ FEATURE GRID ============
const Features = () => {
  const features = [
    { title: "Daily posts", body: "Writes one on-brand post a day, rotating themes across patient education, services, hours, and seasonal messages.", span: 2 },
    { title: "Safe review replies", body: "Auto-replies to 4★ and 5★ reviews. Flags anything lower for a human." },
    { title: "Questions answered", body: "Drafts responses to customer questions, ready for your approval." },
    { title: "Media keeper", body: "Uploads new photos, retires stale ones, keeps your listing fresh." },
    { title: "Services & hours", body: "One command updates your service list, attributes, and opening hours." },
    { title: "Insights you'll actually read", body: "Weekly digest of profile views, direction requests, and calls — with what changed." },
  ];
  return (
    <section style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }} id="features">
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 32px" }}>
        <div style={{ maxWidth: 700 }}>
          <Eyebrow>What it does</Eyebrow>
          <h2 style={sectionH}>Every repetitive GBP task, handled.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, marginTop: 60, background: "var(--line)", border: "1px solid var(--line)" }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: "var(--bg)",
              padding: 32,
              gridColumn: f.span === 2 ? "span 2" : "span 1",
              minHeight: 220,
              display: "flex", flexDirection: "column", justifyContent: "space-between",
              position: "relative"
            }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-60)" }}>0{i + 1}</div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 26, letterSpacing: "-0.01em", marginBottom: 10 }}>{f.title}</div>
                <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink-70)", fontFamily: "var(--font-body)" }}>{f.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============ HOW IT WORKS ============
const HowItWorks = () => {
  const steps = [
    { n: "01", t: "Connect your Google Business Profile", b: "OAuth + service account. Takes five minutes. Synapse can only touch the listings you grant it.", time: "5 min" },
    { n: "02", t: "Tell it about your business", b: "Hours, services, tone of voice, what to never say. It uses this for every draft.", time: "15 min" },
    { n: "03", t: "Flip Autopilot on", b: "From day one: a daily post at 9am, review replies within the hour, weekly insight digests.", time: "forever" },
  ];
  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "120px 32px" }} id="how">
      <div style={{ maxWidth: 700 }}>
        <Eyebrow>How it works</Eyebrow>
        <h2 style={sectionH}>Twenty minutes to set up. Then never again.</h2>
      </div>
      <div style={{ marginTop: 60 }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "80px 1fr 120px",
            gap: 40,
            padding: "40px 0",
            borderTop: "1px solid var(--line)",
            borderBottom: i === steps.length - 1 ? "1px solid var(--line)" : "none",
            alignItems: "baseline"
          }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent)" }}>{s.n}</div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: "-0.02em" }}>{s.t}</div>
              <div style={{ fontSize: 16, lineHeight: 1.55, color: "var(--ink-70)", marginTop: 10, fontFamily: "var(--font-body)", maxWidth: 560 }}>{s.b}</div>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, textAlign: "right", color: "var(--ink-60)" }}>{s.time}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

// ============ TESTIMONIAL ============
const Testimonial = () => (
  <section style={{ background: "var(--accent-soft)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "120px 32px", display: "grid", gridTemplateColumns: "1fr 2fr", gap: 80, alignItems: "center" }}>
      <div>
        <StripePlaceholder label="clinic photo" h={280} />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-60)", marginTop: 12 }}>
          Eritage ENT Care · Entebbe, Uganda
        </div>
      </div>
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 44, fontStyle: "italic", lineHeight: 1.15, letterSpacing: "-0.01em", color: "var(--ink-90)" }}>
          "We went from posting twice a month to posting every day. Our five-star reviews get a thoughtful reply within the hour — something we could never keep up with ourselves."
        </div>
        <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--bg)", fontFamily: "var(--font-display)", fontSize: 20 }}>H</div>
          <div>
            <div style={{ fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 15 }}>Hassan M.</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-70)" }}>Founder, Eritage ENT Care</div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// ============ PRICING ============
const Pricing = () => {
  const plans = [
    { name: "Starter", price: "$49", per: "/ month", desc: "For a single location getting started.", features: ["Daily post", "Auto-reply 4★/5★", "Weekly insights", "Email support"], cta: "Start trial" },
    { name: "Practice", price: "$129", per: "/ month", desc: "For growing teams who want more.", features: ["Everything in Starter", "Media auto-refresh", "Custom post themes", "Conversational AI agent", "Priority support"], cta: "Start trial", featured: true },
    { name: "Enterprise", price: "Let's talk", per: "", desc: "Multiple locations, custom policy rules.", features: ["Unlimited locations", "Custom policy guard", "SSO + audit exports", "Dedicated success manager"], cta: "Contact sales" },
  ];
  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "120px 32px" }} id="pricing">
      <div style={{ maxWidth: 700 }}>
        <Eyebrow>Pricing</Eyebrow>
        <h2 style={sectionH}>Simple, per location.</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, marginTop: 60, background: "var(--line)", border: "1px solid var(--line)" }}>
        {plans.map((p, i) => (
          <div key={i} style={{
            background: p.featured ? "var(--ink-90)" : "var(--bg)",
            color: p.featured ? "var(--bg)" : "var(--ink-90)",
            padding: 40,
            display: "flex", flexDirection: "column", gap: 24
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 24 }}>{p.name}</div>
              {p.featured && <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "3px 8px", borderRadius: 3, background: "var(--accent)", color: "oklch(0.2 0.02 40)" }}>POPULAR</div>}
            </div>
            <div>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 56, letterSpacing: "-0.03em" }}>{p.price}</span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 14, opacity: 0.7, marginLeft: 4 }}>{p.per}</span>
            </div>
            <div style={{ fontSize: 14, opacity: 0.75, fontFamily: "var(--font-body)" }}>{p.desc}</div>
            <div style={{ height: 1, background: p.featured ? "oklch(0.3 0.01 60)" : "var(--line)" }} />
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {p.features.map(f => (
                <li key={f} style={{ fontSize: 14, fontFamily: "var(--font-body)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: 12, marginTop: 2 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <div style={{ flex: 1 }} />
            <button style={{
              padding: "14px 20px",
              borderRadius: 999,
              border: p.featured ? "none" : "1px solid var(--line-strong)",
              background: p.featured ? "var(--accent)" : "transparent",
              color: p.featured ? "oklch(0.2 0.02 40)" : "var(--ink-90)",
              fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500,
              cursor: "pointer"
            }}>{p.cta} →</button>
          </div>
        ))}
      </div>
    </section>
  );
};

// ============ CTA + FOOTER ============
const FinalCTA = () => (
  <section style={{ borderTop: "1px solid var(--line)" }} id="cta">
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "140px 32px", textAlign: "center" }}>
      <Eyebrow><span style={{ margin: "0 auto" }}>Ready when you are</span></Eyebrow>
      <h2 style={{
        fontFamily: "var(--font-display)",
        fontSize: "clamp(48px, 7vw, 88px)",
        letterSpacing: "-0.03em",
        lineHeight: 1,
        margin: "24px auto 0",
        maxWidth: 900
      }}>
        Let your business <span style={{ fontStyle: "italic", color: "var(--accent)" }}>run itself</span> while you see patients.
      </h2>
      <div style={{ marginTop: 40, display: "flex", gap: 12, justifyContent: "center" }}>
        <a href="mailto:hello@synapse.app" style={{
          padding: "18px 32px",
          background: "var(--ink-90)",
          color: "var(--bg)",
          borderRadius: 999,
          fontFamily: "var(--font-body)",
          fontSize: 16, fontWeight: 500,
          textDecoration: "none"
        }}>Contact sales →</a>
        <a href="#how" style={{
          padding: "18px 32px",
          border: "1px solid var(--line-strong)",
          borderRadius: 999,
          fontFamily: "var(--font-body)",
          fontSize: 16, fontWeight: 500,
          color: "var(--ink-90)",
          textDecoration: "none"
        }}>Book a demo</a>
      </div>
      <div style={{ marginTop: 20, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-60)" }}>
        No credit card. 14-day trial. Cancel anytime.
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer style={{ background: "var(--ink-90)", color: "var(--bg)" }}>
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 32px 40px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: "var(--bg)",
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative"
            }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", border: `1.5px solid var(--accent)` }} />
              <div style={{ position: "absolute", width: 5, height: 5, borderRadius: "50%", background: "var(--accent)" }} />
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 24 }}>Synapse</span>
          </div>
          <div style={{ marginTop: 16, fontFamily: "var(--font-body)", fontSize: 14, color: "oklch(0.75 0.01 60)", maxWidth: 300 }}>
            Autopilot for Google Business Profile. For local businesses that'd rather see customers than write posts.
          </div>
        </div>
        {[
          { h: "Product", links: ["Features", "Pricing", "Policy guard", "Changelog"] },
          { h: "Company", links: ["About", "Customers", "Blog", "Contact"] },
          { h: "Legal", links: ["Privacy", "Terms", "Security", "DPA"] },
        ].map(col => (
          <div key={col.h}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "oklch(0.65 0.01 60)", marginBottom: 16 }}>{col.h}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {col.links.map(l => <a key={l} href="#" style={{ color: "oklch(0.85 0.01 60)", textDecoration: "none", fontSize: 14, fontFamily: "var(--font-body)" }}>{l}</a>)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 60, paddingTop: 24, borderTop: "1px solid oklch(0.3 0.01 60)", display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 11, color: "oklch(0.6 0.01 60)" }}>
        <div>© 2026 Synapse. Made for local businesses.</div>
        <div>hello@synapse.app</div>
      </div>
    </div>
  </footer>
);

// ============ TWEAKS PANEL ============
const TweaksPanel = ({ visible, state, setState }) => {
  if (!visible) return null;
  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 100,
      width: 280, background: "var(--bg)", border: "1px solid var(--line-strong)",
      borderRadius: 10, boxShadow: "0 20px 40px -10px oklch(0.2 0.05 60 / 0.2)",
      padding: 18, fontFamily: "var(--font-body)"
    }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-60)", marginBottom: 14 }}>Tweaks</div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "var(--ink-80)", marginBottom: 8, fontWeight: 500 }}>Font pair</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {Object.entries(FONT_PAIRS).map(([k, v]) => (
            <button key={k} onClick={() => setState({ ...state, fontPair: k })}
              style={{
                textAlign: "left", padding: "8px 10px", fontSize: 12,
                border: `1px solid ${state.fontPair === k ? "var(--accent)" : "var(--line)"}`,
                background: state.fontPair === k ? "var(--accent-soft)" : "var(--bg)",
                borderRadius: 6, cursor: "pointer", fontFamily: "var(--font-body)"
              }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, color: "var(--ink-80)", marginBottom: 8, fontWeight: 500 }}>Accent</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          {Object.entries(ACCENTS).map(([k, v]) => (
            <button key={k} onClick={() => setState({ ...state, accent: k })}
              title={v.name}
              style={{
                aspectRatio: "1", background: v.color,
                border: `2px solid ${state.accent === k ? "var(--ink-90)" : "transparent"}`,
                borderRadius: 6, cursor: "pointer"
              }} />
          ))}
        </div>
      </div>
    </div>
  );
};

// ============ APP ============
const sectionH = {
  fontFamily: "var(--font-display)",
  fontSize: "clamp(40px, 5vw, 64px)",
  letterSpacing: "-0.025em",
  lineHeight: 1.02,
  fontWeight: 400,
  margin: "16px 0 0"
};

function App() {
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [tweaksVisible, setTweaksVisible] = useState(false);

  const font = FONT_PAIRS[tweaks.fontPair];
  const accent = ACCENTS[tweaks.accent];

  useEffect(() => {
    // Font loading
    const id = "font-import-" + tweaks.fontPair;
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = font.import;
      document.head.appendChild(link);
    }
  }, [tweaks.fontPair]);

  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === "__activate_edit_mode") setTweaksVisible(true);
      if (e.data?.type === "__deactivate_edit_mode") setTweaksVisible(false);
    };
    window.addEventListener("message", handler);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits: tweaks }, "*");
  }, [tweaks]);

  const cssVars = {
    "--font-display": font.display,
    "--font-body": font.body,
    "--font-mono": font.mono,
    "--bg": "oklch(0.985 0.008 75)",
    "--bg-soft": "oklch(0.96 0.012 75)",
    "--ink-90": "oklch(0.2 0.01 60)",
    "--ink-80": "oklch(0.32 0.01 60)",
    "--ink-70": "oklch(0.45 0.01 60)",
    "--ink-60": "oklch(0.58 0.01 60)",
    "--line": "oklch(0.9 0.01 70)",
    "--line-strong": "oklch(0.82 0.01 70)",
    "--accent": accent.color,
    "--accent-soft": accent.soft,
    "--accent-ink": accent.ink,
    background: "var(--bg)",
    color: "var(--ink-90)",
    fontFamily: "var(--font-body)",
    minHeight: "100vh"
  };

  return (
    <div style={cssVars}>
      <Nav />
      <Hero />
      <Metrics />
      <DashboardSection />
      <ChatShowcase />
      <PolicyGuard />
      <Features />
      <HowItWorks />
      <Testimonial />
      <Pricing />
      <FinalCTA />
      <Footer />
      <TweaksPanel visible={tweaksVisible} state={tweaks} setState={setTweaks} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
