import React, { useState, useEffect, useCallback } from 'react';
import { API, findMetric, sparkFrom, fmtNum, starNum, starStr, relTime, auditTypeLabel } from './data.jsx';
import { T, Mono, Label, Pill, Card, CardHead, Btn, Ico, Skel, showToast } from './primitives.jsx';
import { ChartArea } from './ChartArea.jsx';
import { Sparkline } from './Sparkline.jsx';

export function DashboardView({ onNavigate, reviews, lastRefreshed }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [insights, setInsights] = useState([]);
  const [apData, setApData] = useState(null);
  const [auditEntries, setAuditEntries] = useState([]);
  const [period, setPeriod] = useState("last28");
  const [running, setRunning] = useState(false);

  const load = useCallback(async (p = period) => {
    try {
      setLoading(true);
      console.log('[Dashboard] Loading data...');
      const [pro, ins, ap, log] = await Promise.all([
        API.profile().catch(e => { console.error('[Dashboard] profile error:', e); return null; }),
        API.insights(p).catch(e => { console.error('[Dashboard] insights error:', e); return null; }),
        API.apStatus().catch(e => { console.error('[Dashboard] apStatus error:', e); return null; }),
        API.auditLog(10).catch(e => { console.error('[Dashboard] auditLog error:', e); return null; }),
      ]);
      console.log('[Dashboard] Data loaded:', { pro, ins, ap, log });
      setProfile(pro?.profile || null);
      setInsights(ins?.insights || []);
      setApData(ap || null);
      setAuditEntries(log?.entries || []);
      setLoading(false);
    } catch (e) {
      console.error('[Dashboard] Load failed:', e);
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(period); }, [period, lastRefreshed]);

  const handleRunNow = async () => {
    setRunning(true);
    try {
      await API.runDaily();
      showToast("Daily cycle started — refresh in a minute to see results.", "good");
      setTimeout(() => load(period), 3000);
    } catch(e) { showToast(e.message, "bad"); }
    finally { setRunning(false); }
  };

  // Build 4 KPI metrics from insights
  const kpis = (() => {
    if (!insights.length) return [];
    const cfg = [
      { label: "Profile views",      parts: ["IMPRESSIONS"],         color: T.accent },
      { label: "Direction requests",  parts: ["DIRECTION_REQUESTS"],  color: T.good   },
      { label: "Calls",               parts: ["CALL_CLICKS"],         color: T.ink70  },
      { label: "Website clicks",      parts: ["WEBSITE_CLICKS"],      color: T.warn   },
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
  const directions  = findMetric(insights, "DIRECTION_REQUESTS");
  const chartA = impressions?.raw?.map(d => parseInt(d.value,10)||0) || [];
  const chartB = directions?.raw?.map(d => parseInt(d.value,10)||0) || [];

  // Reviews needing attention
  const unanswered = reviews.filter(r => !r.hasReply && starNum(r.starRating) >= 4);
  const flagged    = reviews.filter(r => !r.hasReply && starNum(r.starRating) <= 3);

  // Calendar from status
  const calendar = apData?.calendar || [];
  const todayTheme = apData?.status?.dailyPost?.todaysTheme;

  const themeNames = { community_awareness:"Community", clinic_culture:"Clinic Culture", service_spotlight:"Services", wellness_tip:"Wellness Tip", did_you_know:"Did You Know", weekly_reminder:"Weekly Reminder", family_wellness:"Family" };

  return (
    <div style={{ padding:"28px 32px 60px", display:"flex", flexDirection:"column", gap:24 }}>
      {/* KPI row */}
      {loading ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:0, border:`1px solid ${T.line}`, borderRadius:10, background:T.bgElev, overflow:"hidden" }}>
          {[0,1,2,3].map(i => <div key={i} style={{ padding:20, borderLeft: i===0?"none":`1px solid ${T.line}` }}><Skel h={12} style={{ marginBottom:14 }} /><Skel h={40} w="60%" /></div>)}
        </div>
      ) : kpis.length > 0 ? (
        <div data-keep-grid="4" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:0, border:`1px solid ${T.line}`, borderRadius:10, background:T.bgElev, overflow:"hidden" }}>
          {kpis.map((m, i) => (
            <div key={i} style={{ padding:20, borderLeft: i===0?"none":`1px solid ${T.line}` }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <Label>{m.label}</Label>
              </div>
              <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginTop:12 }}>
                <div style={{ fontFamily:T.fontDisp, fontSize:40, letterSpacing:"-0.02em", lineHeight:1 }}>{m.value}</div>
                <Sparkline data={m.spark} color={m.color} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card><Mono size={12}>No insights data available. GBP API may need more time to populate.</Mono></Card>
      )}

      {/* Chart + Autopilot today */}
      <div style={{ display:"grid", gridTemplateColumns:"1.6fr 1fr", gap:20 }}>
        <Card>
          <CardHead eyebrow={period === "last7" ? "Last 7 days" : period === "last28" ? "Last 28 days" : "Last 90 days"} title="Profile activity"
            right={
              <div style={{ display:"flex", gap:6 }}>
                {[["7d","last7"],["28d","last28"],["90d","last90"]].map(([l, p]) => (
                  <span key={p} onClick={() => setPeriod(p)} style={{ padding:"4px 10px", border:`1px solid ${period===p ? T.ink : T.line}`, borderRadius:4, background: period===p ? T.ink : "transparent", color: period===p ? T.bg : T.ink70, fontFamily:T.fontMono, fontSize:11, cursor:"pointer" }}>{l}</span>
                ))}
              </div>
            }
          />
          {loading ? <Skel h={200} /> : <ChartArea seriesA={chartA} seriesB={chartB} />}
          <div style={{ display:"flex", gap:20, marginTop:16, paddingTop:16, borderTop:`1px solid ${T.line}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}><span style={{ width:10, height:2, background:T.accent }} /><Mono size={11}>Profile views</Mono></div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}><span style={{ width:10, height:2, background:T.ink, opacity:0.5 }} /><Mono size={11}>Direction requests</Mono></div>
          </div>
        </Card>

        <Card dark>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
            <div><Pill tone="dark" dot>LIVE · AUTOPILOT</Pill><div style={{ fontFamily:T.fontDisp, fontSize:24, letterSpacing:"-0.02em", marginTop:12, color:T.bg }}>Today's plan</div></div>
            <Mono size={11} color={T.accent}>{todayTheme ? `Theme: ${themeNames[todayTheme.theme] || todayTheme.theme}` : "—"}</Mono>
          </div>
          {loading ? (
            <Skel h={80} style={{ background:"oklch(0.25 0.01 60)" }} />
          ) : (
            <div style={{ fontSize:13, lineHeight:1.55, color:"oklch(0.85 0.01 60)", padding:14, background:"oklch(0.22 0.01 60)", borderRadius:6, border:"1px solid oklch(0.28 0.01 60)" }}>
              {apData?.status?.dailyPost?.postedToday
                ? "✓ Post already published today. Next run tomorrow at 09:00 EAT."
                : todayTheme
                  ? `Next post scheduled at 09:00 EAT. Topic: ${themeNames[todayTheme.theme] || todayTheme.theme}`
                  : "Autopilot status unavailable. Check your connection."}
            </div>
          )}
          <div style={{ marginTop:14, display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:6 }}>
            {[
              { k:"Autopilot",   v: apData?.status?.enabled ? "Enabled" : "Disabled", ok: apData?.status?.enabled },
              { k:"Daily post",  v: apData?.status?.dailyPost?.enabled ? "On" : "Off", ok: apData?.status?.dailyPost?.enabled },
              { k:"Auto-reply",  v: apData?.status?.autoReplies?.enabled ? "On" : "Off", ok: apData?.status?.autoReplies?.enabled },
              { k:"Posted today",v: apData?.status?.dailyPost?.postedToday ? "Yes" : "Pending", ok: apData?.status?.dailyPost?.postedToday },
            ].map(c => (
              <div key={c.k} style={{ display:"flex", justifyContent:"space-between", fontFamily:T.fontMono, fontSize:11, padding:"6px 10px", background:"oklch(0.22 0.01 60)", borderRadius:4, color:"oklch(0.75 0.01 60)" }}>
                <span>{c.k}</span>
                <span style={{ color: loading ? T.ink60 : c.ok ? T.good : T.warn }}>{loading ? "—" : c.v}</span>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:6, marginTop:14 }}>
            <Btn tone="accent" size="sm" style={{ flex:1, justifyContent:"center" }} onClick={handleRunNow} disabled={running}><Ico name="play" size={11} />{running ? "Running…" : "Run daily cycle"}</Btn>
            <Btn size="sm" style={{ background:"transparent", color:T.bg, borderColor:"oklch(0.3 0.01 60)" }} onClick={() => onNavigate("autopilot")}><Ico name="arrow" size={11} /></Btn>
          </div>
        </Card>
      </div>

      {/* Review queue + Calendar */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <Card flush>
          <div style={{ padding:20, display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${T.line}` }}>
            <div>
              <Label>Review queue</Label>
              <div style={{ fontSize:15, fontWeight:500, marginTop:4 }}>
                {loading ? <Skel h={16} w={120} /> : `${unanswered.length} unanswered · ${flagged.length} flagged`}
              </div>
            </div>
            <Btn size="sm" onClick={() => onNavigate("reviews")}>View all <Ico name="arrow" size={12} /></Btn>
          </div>
          {loading ? (
            [0,1,2].map(i => <div key={i} style={{ padding:"14px 20px", borderTop:`1px solid ${T.line}` }}><Skel h={14} style={{ marginBottom:8 }} /><Skel h={12} w="70%" /></div>)
          ) : reviews.length === 0 ? (
            <div style={{ padding:20 }}><Mono size={12}>No reviews found.</Mono></div>
          ) : (
            reviews.slice(0, 3).map((r, i) => {
              const stars = starNum(r.starRating);
              const status = r.hasReply ? "replied" : stars <= 3 ? "flagged" : "unanswered";
              return (
                <div key={r.reviewId || i} style={{ padding:"14px 20px", borderBottom: i < 2 ? `1px solid ${T.line}` : "none", display:"grid", gridTemplateColumns:"36px 1fr auto", gap:12, alignItems:"flex-start" }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:T.bgSoft, border:`1px solid ${T.line}`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontMono, fontSize:11, fontWeight:500 }}>
                    {(r.reviewer || "?").slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:500 }}>{r.reviewer || "Anonymous"}</span>
                      <Mono size={10} color={stars >= 4 ? T.warn : T.bad}>{starStr(stars)}</Mono>
                      <Mono size={10}>· {relTime(r.createTime)}</Mono>
                    </div>
                    <div style={{ fontSize:12, color:T.ink70, lineHeight:1.5, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{r.comment || "(no text)"}</div>
                  </div>
                  <Pill tone={status==="replied" ? "good" : status==="flagged" ? "bad" : "warn"}>{status}</Pill>
                </div>
              );
            })
          )}
        </Card>

        <Card>
          <CardHead eyebrow="Content calendar" title="Next 7 days" right={<Btn size="sm" tone="subtle" onClick={() => onNavigate("autopilot")}><Ico name="calendar" size={12} /> Full plan</Btn>} />
          {loading ? (
            <Skel h={120} />
          ) : calendar.length > 0 ? (
            <div data-keep-grid="7" style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
              {calendar.map((d, i) => {
                const today = i === 0;
                const done  = new Date(d.date) < new Date() && !today;
                const themeShort = (themeNames[d.theme] || d.theme || "").split(" ")[0];
                const dateObj = new Date(d.date);
                const dayLabel = ["Su","Mo","Tu","We","Th","Fr","Sa"][dateObj.getDay()];
                const dateNum  = dateObj.getDate();
                return (
                  <div key={i} style={{ padding:"10px 8px", borderRadius:6, background: today ? T.ink : done ? T.bgSoft : T.bgElev, border:`1px solid ${today ? T.ink : T.line}`, color: today ? T.bg : T.ink, minHeight:120, display:"flex", flexDirection:"column" }}>
                    <Mono size={9} color={today ? T.accent : T.ink60}>{dayLabel}</Mono>
                    <div style={{ fontFamily:T.fontDisp, fontSize:18, lineHeight:1, marginTop:2 }}>{dateNum}</div>
                    <div style={{ fontSize:10, fontWeight:500, marginTop:10, color: today ? T.bg : T.ink70 }}>{themeShort}</div>
                    <div style={{ flex:1 }} />
                    {done && <Mono size={9} color={T.good}>✓ done</Mono>}
                    {today && <Mono size={9} color={T.accent}>● today</Mono>}
                  </div>
                );
              })}
            </div>
          ) : (
            <Mono size={12}>Calendar unavailable.</Mono>
          )}
        </Card>
      </div>

      {/* Audit log preview */}
      <Card flush>
        <div style={{ padding:20, display:"flex", justifyContent:"space-between", borderBottom:`1px solid ${T.line}` }}>
          <div><Label>Audit log · live</Label><div style={{ fontSize:15, fontWeight:500, marginTop:4 }}>Recent autonomous actions</div></div>
          <Btn size="sm" onClick={() => onNavigate("audit")}>Full log <Ico name="arrow" size={12} /></Btn>
        </div>
        <div style={{ padding:"4px 0" }}>
          {loading ? (
            [0,1,2,3].map(i => <div key={i} style={{ padding:"10px 20px", borderTop:`1px solid ${T.line}` }}><Skel h={12} /></div>)
          ) : auditEntries.length === 0 ? (
            <div style={{ padding:20 }}><Mono size={12}>No audit log entries yet. Run the daily cycle to generate activity.</Mono></div>
          ) : (
            [...auditEntries].reverse().slice(0, 6).map((l, i) => {
              const tone = l.type?.includes("rejected") || l.type?.includes("unauthorized") ? "bad" : l.type?.includes("skip") ? "warn" : "good";
              return (
                <div key={i} style={{ padding:"10px 20px", display:"grid", gridTemplateColumns:"160px 180px 70px 1fr", gap:16, alignItems:"center", borderTop: i > 0 ? `1px solid ${T.line}` : "none" }}>
                  <Mono size={11}>{new Date(l.ts).toLocaleTimeString("en-UG", { hour:"2-digit", minute:"2-digit", second:"2-digit" })}</Mono>
                  <Mono size={11} color={T.ink80}>{auditTypeLabel(l.type)}</Mono>
                  <Pill tone={tone}>{tone === "bad" ? "error" : tone}</Pill>
                  <span style={{ fontSize:12, color:T.ink80, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.payload?.msg || l.payload?.reason || l.type}</span>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
