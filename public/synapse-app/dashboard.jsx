// Synapse — Dashboard home view
function Sparkline({ data, color = T.accent, w = 80, h = 24 }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  const last = data[data.length - 1];
  const lastY = h - ((last - min) / range) * h;
  const lastX = w;
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}

function ChartArea({ h = 200 }) {
  // 30 days of mock data, two series
  const days = 30;
  const seriesA = Array.from({ length: days }, (_, i) => 400 + Math.sin(i / 3) * 80 + i * 18 + Math.random() * 40);
  const seriesB = Array.from({ length: days }, (_, i) => 200 + Math.cos(i / 4) * 50 + i * 9 + Math.random() * 30);
  const max = Math.max(...seriesA, ...seriesB);
  const w = 800;
  const pad = 20;

  const toPath = (arr) => arr.map((v, i) => {
    const x = pad + (i / (days - 1)) * (w - pad * 2);
    const y = pad + (1 - v / max) * (h - pad * 2);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(" ");

  const toArea = (arr) => {
    const path = toPath(arr);
    const lastX = pad + (w - pad * 2);
    const baseY = h - pad;
    return path + ` L${lastX},${baseY} L${pad},${baseY} Z`;
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.accent} stopOpacity="0.2" />
          <stop offset="100%" stopColor={T.accent} stopOpacity="0" />
        </linearGradient>
        <pattern id="grid" width="80" height="40" patternUnits="userSpaceOnUse">
          <path d="M 80 0 L 0 0 0 40" fill="none" stroke={T.line} strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width={w} height={h} fill="url(#grid)" />
      <path d={toArea(seriesA)} fill="url(#gradA)" />
      <path d={toPath(seriesA)} fill="none" stroke={T.accent} strokeWidth="2" />
      <path d={toPath(seriesB)} fill="none" stroke={T.ink} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />
    </svg>
  );
}

function DashboardView() {
  return (
    <div style={{ padding: "28px 32px 60px", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Metrics row */}
      <div data-keep-grid="4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, border: `1px solid ${T.line}`, borderRadius: 10, background: T.bgElev, overflow: "hidden" }}>
        {MOCK.metrics.map((m, i) => (
          <div key={i} style={{ padding: 20, borderLeft: i === 0 ? "none" : `1px solid ${T.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Label>{m.label}</Label>
              <Pill tone="good">{m.delta}</Pill>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 12 }}>
              <div style={{ fontFamily: T.fontDisp, fontSize: 40, letterSpacing: "-0.02em", lineHeight: 1 }}>{m.value}</div>
              <Sparkline data={m.spark} />
            </div>
          </div>
        ))}
      </div>

      {/* Main grid: chart + today's autopilot */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
        <Card>
          <CardHead
            eyebrow="Last 30 days"
            title="Profile activity"
            right={
              <div style={{ display: "flex", gap: 6 }}>
                {["7d", "30d", "90d"].map((p, i) => (
                  <Mono key={p} size={11} style={{
                    padding: "4px 10px",
                    border: `1px solid ${i === 1 ? T.ink : T.line}`,
                    borderRadius: 4,
                    background: i === 1 ? T.ink : "transparent",
                    color: i === 1 ? T.bg : T.ink70,
                    cursor: "pointer"
                  }}>{p}</Mono>
                ))}
              </div>
            }
          />
          <ChartArea />
          <div style={{ display: "flex", gap: 20, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.line}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 2, background: T.accent }} />
              <Mono size={11}>Profile views</Mono>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 2, background: T.ink, opacity: 0.5 }} />
              <Mono size={11}>Search impressions</Mono>
            </div>
          </div>
        </Card>

        {/* Today's autopilot */}
        <Card dark>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <Pill tone="dark" dot>LIVE · AUTOPILOT</Pill>
              <div style={{ fontFamily: T.fontDisp, fontSize: 24, letterSpacing: "-0.02em", marginTop: 12, color: T.bg }}>Today's plan</div>
            </div>
            <Mono size={11} color={T.accent}>{MOCK.todayPost.scheduledAt}</Mono>
          </div>

          <div style={{ fontSize: 13, lineHeight: 1.55, color: "oklch(0.85 0.01 60)", fontFamily: T.fontSans, padding: 14, background: "oklch(0.22 0.01 60)", borderRadius: 6, border: "1px solid oklch(0.28 0.01 60)" }}>
            {MOCK.todayPost.preview}
          </div>

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
            {MOCK.todayPost.checks.map(c => (
              <div key={c.k} style={{ display: "flex", justifyContent: "space-between", fontFamily: T.fontMono, fontSize: 11, padding: "6px 10px", background: "oklch(0.22 0.01 60)", borderRadius: 4, color: "oklch(0.75 0.01 60)" }}>
                <span>{c.k}</span>
                <span style={{ color: c.ok ? T.good : T.bad }}>✓ {c.v}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
            <Btn tone="accent" size="sm" style={{ flex: 1, justifyContent: "center" }}><Ico name="play" size={11} /> Publish now</Btn>
            <Btn size="sm" style={{ background: "transparent", color: T.bg, borderColor: "oklch(0.3 0.01 60)" }}><Ico name="edit" size={11} /> Edit</Btn>
          </div>
        </Card>
      </div>

      {/* Review queue + 7-day calendar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card flush>
          <div style={{ padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.line}` }}>
            <div>
              <Label>Review queue</Label>
              <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>3 awaiting action</div>
            </div>
            <Btn size="sm">View all <Ico name="arrow" size={12} /></Btn>
          </div>
          {MOCK.reviews.slice(0, 3).map((r, i) => (
            <div key={r.id} style={{
              padding: "14px 20px",
              borderBottom: i < 2 ? `1px solid ${T.line}` : "none",
              display: "grid", gridTemplateColumns: "36px 1fr auto", gap: 12, alignItems: "flex-start"
            }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.bgSoft, border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.fontMono, fontSize: 11, fontWeight: 500 }}>{r.initials}</div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</span>
                  <Mono size={10}>{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</Mono>
                  <Mono size={10}>· {r.time} ago</Mono>
                </div>
                <div style={{ fontSize: 12, color: T.ink70, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {r.text}
                </div>
              </div>
              <Pill tone={r.status === "auto-replied" ? "good" : r.status === "flagged" ? "bad" : "warn"}>
                {r.status === "auto-replied" ? "Replied" : r.status === "flagged" ? "Flagged" : "Drafted"}
              </Pill>
            </div>
          ))}
        </Card>

        <Card>
          <CardHead eyebrow="Content calendar" title="Next 7 days" right={<Btn size="sm" tone="subtle"><Ico name="calendar" size={12} /> Edit plan</Btn>} />
          <div data-keep-grid="7" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {MOCK.calendar.map((d, i) => (
              <div key={i} style={{
                padding: "10px 8px",
                borderRadius: 6,
                background: d.today ? T.ink : (d.done ? T.bgSoft : T.bgElev),
                border: `1px solid ${d.today ? T.ink : T.line}`,
                color: d.today ? T.bg : T.ink,
                minHeight: 120,
                display: "flex", flexDirection: "column"
              }}>
                <Mono size={9} color={d.today ? T.accent : T.ink60}>{d.day}</Mono>
                <div style={{ fontFamily: T.fontDisp, fontSize: 18, lineHeight: 1, marginTop: 2 }}>{d.date}</div>
                <div style={{ fontSize: 10, fontWeight: 500, marginTop: 10, color: d.today ? T.bg : T.ink70 }}>{d.theme}</div>
                <div style={{ fontSize: 10, color: d.today ? "oklch(0.75 0.01 60)" : T.ink60, marginTop: 4, lineHeight: 1.3 }}>{d.topic}</div>
                <div style={{ flex: 1 }} />
                {d.done && <Mono size={9} color={d.today ? T.accent : T.good}>✓ shipped</Mono>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Audit log preview */}
      <Card flush>
        <div style={{ padding: 20, display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${T.line}` }}>
          <div>
            <Label>Audit log · live</Label>
            <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>Recent autonomous actions</div>
          </div>
          <Btn size="sm">Full log <Ico name="arrow" size={12} /></Btn>
        </div>
        <div style={{ padding: "4px 0" }}>
          {MOCK.auditLog.slice(0, 6).map((l, i) => (
            <div key={i} style={{
              padding: "10px 20px",
              display: "grid", gridTemplateColumns: "80px 140px 70px 1fr",
              gap: 16, alignItems: "center",
              borderTop: i > 0 ? `1px solid ${T.line}` : "none"
            }}>
              <Mono size={11}>{l.ts}</Mono>
              <Mono size={11} color={T.ink80}>{l.type}</Mono>
              <Pill tone={l.status === "ok" ? "good" : l.status === "warn" ? "warn" : "neutral"}>{l.status}</Pill>
              <span style={{ fontSize: 13, color: T.ink80 }}>{l.msg}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

window.DashboardView = DashboardView;
window.ChartArea = ChartArea;
window.Sparkline = Sparkline;
