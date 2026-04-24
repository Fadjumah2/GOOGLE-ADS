import React, { useState, useEffect, useRef, useMemo } from 'react';

// ============ DESIGN TOKENS ============
export const T = {
  bg:        "oklch(0.985 0.005 75)",
  bgSoft:    "oklch(0.965 0.008 75)",
  bgElev:    "#ffffff",
  bgDark:    "oklch(0.18 0.01 60)",
  ink:       "oklch(0.18 0.01 60)",
  ink80:     "oklch(0.32 0.01 60)",
  ink70:     "oklch(0.45 0.01 60)",
  ink60:     "oklch(0.58 0.01 60)",
  ink40:     "oklch(0.72 0.01 60)",
  line:      "oklch(0.92 0.005 75)",
  lineStrong:"oklch(0.85 0.008 75)",
  accent:    "oklch(0.62 0.14 40)",
  accentSoft:"oklch(0.94 0.04 60)",
  accentInk: "oklch(0.32 0.1 40)",
  good:      "oklch(0.55 0.12 150)",
  goodSoft:  "oklch(0.94 0.04 150)",
  warn:      "oklch(0.65 0.13 75)",
  warnSoft:  "oklch(0.95 0.05 80)",
  bad:       "oklch(0.55 0.15 25)",
  badSoft:   "oklch(0.94 0.04 25)",
  fontSans:  "'Geist', system-ui, sans-serif",
  fontMono:  "'Geist Mono', ui-monospace, monospace",
  fontDisp:  "'Instrument Serif', serif"
};

// ============ PRIMITIVES ============
export const Mono = ({ children, style, size = 11, color }) => (
  <span style={{ fontFamily: T.fontMono, fontSize: size, letterSpacing: "0.02em", color: color || T.ink60, ...style }}>{children}</span>
);

export const Label = ({ children, color = T.ink60 }) => (
  <span style={{ fontFamily: T.fontMono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color }}>{children}</span>
);

export const Pill = ({ children, tone = "neutral", dot = false }) => {
  const tones = {
    neutral: { bg: T.bgSoft,    fg: T.ink70,  dotC: T.ink60 },
    good:    { bg: T.goodSoft,  fg: T.good,   dotC: T.good  },
    warn:    { bg: T.warnSoft,  fg: "oklch(0.42 0.1 75)", dotC: T.warn },
    bad:     { bg: T.badSoft,   fg: T.bad,    dotC: T.bad   },
    accent:  { bg: T.accentSoft,fg: T.accentInk, dotC: T.accent },
    dark:    { bg: T.bgDark,    fg: T.bg,     dotC: T.accent }
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"3px 9px", borderRadius:999, background:t.bg, color:t.fg, fontFamily:T.fontMono, fontSize:10, letterSpacing:"0.06em", textTransform:"uppercase", fontWeight:500 }}>
      {dot && <span style={{ width:6, height:6, borderRadius:"50%", background:t.dotC, flexShrink:0 }} />}
      {children}
    </span>
  );
};

export const Card = ({ children, style, dark = false, flush = false }) => (
  <div style={{ background: dark ? T.bgDark : T.bgElev, color: dark ? T.bg : "inherit", border:`1px solid ${dark ? "oklch(0.25 0.01 60)" : T.line}`, borderRadius:10, padding: flush ? 0 : 20, ...style }}>
    {children}
  </div>
);

export const CardHead = ({ title, sub, eyebrow, right, style }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:18, ...style }}>
    <div>
      {eyebrow && <Label>{eyebrow}</Label>}
      <div style={{ fontSize:16, fontWeight:500, letterSpacing:"-0.01em", marginTop: eyebrow ? 6 : 0 }}>{title}</div>
      {sub && <div style={{ fontSize:13, color:T.ink70, marginTop:3 }}>{sub}</div>}
    </div>
    {right}
  </div>
);

export const Btn = ({ children, tone = "ghost", size = "md", onClick, style, disabled, ...props }) => {
  const sizes = { sm:{ p:"6px 12px", f:12 }, md:{ p:"9px 16px", f:13 }, lg:{ p:"12px 20px", f:14 } };
  const tones = {
    ghost:  { bg:"transparent",         fg:T.ink,   bd:T.lineStrong },
    solid:  { bg:T.ink,                 fg:T.bg,    bd:T.ink        },
    accent: { bg:T.accent,              fg:T.bg,    bd:T.accent     },
    subtle: { bg:T.bgSoft,              fg:T.ink,   bd:T.line       },
    danger: { bg:"oklch(0.55 0.15 25)", fg:"#fff",  bd:"oklch(0.55 0.15 25)" },
  };
  const t = tones[tone] || tones.ghost;
  const s = sizes[size] || sizes.md;
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding:s.p, fontSize:s.f, fontFamily:T.fontSans, fontWeight:500, background:t.bg, color:t.fg, border:`1px solid ${t.bd}`, borderRadius:6, cursor: disabled ? "not-allowed" : "pointer", display:"inline-flex", alignItems:"center", gap:6, transition:"opacity 0.15s", opacity: disabled ? 0.5 : 1, ...style }}
      onMouseOver={e => !disabled && (e.currentTarget.style.opacity = "0.8")}
      onMouseOut={e => !disabled && (e.currentTarget.style.opacity = "1")}
      {...props}>
      {children}
    </button>
  );
};

export const Ico = ({ name, size = 14, color = "currentColor", stroke = 1.5 }) => {
  const paths = {
    dashboard: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
    reviews:   "M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.8 5.8 21l1.4-7L2 9.3l7-.8z",
    posts:     "M4 4h16v3H4zM4 10h10M4 14h16M4 18h10",
    autopilot: "M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1",
    ai:        "M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z",
    analytics: "M4 19V9M10 19V5M16 19v-7M22 19H2",
    services:  "M4 7h16v11H4zM9 3h6v4H9zM9 12h6",
    media:     "M4 5h16v14H4zM4 15l4-4 3 3 5-5 4 4",
    settings:  "M12 8a4 4 0 100 8 4 4 0 000-8zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5",
    send:      "M22 2L11 13M22 2l-7 20-4-9-9-4z",
    search:    "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
    plus:      "M12 5v14M5 12h14",
    check:     "M5 12l4 4L19 6",
    x:         "M6 6l12 12M18 6L6 18",
    arrow:     "M5 12h14M13 5l7 7-7 7",
    arrowDown: "M6 9l6 6 6-6",
    arrowUp:   "M18 15l-6-6-6 6",
    arrowLeft: "M19 12H5M12 19l-7-7 7-7",
    home:      "M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5zM9 21V12h6v9",
    alert:     "M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3l-8.5-14.1a2 2 0 00-3.4 0z",
    shield:    "M12 2l9 4v6c0 5-4 9-9 10-5-1-9-5-9-10V6z",
    bolt:      "M13 2L3 14h8v8l10-12h-8z",
    calendar:  "M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18",
    clock:     "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
    star:      "M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z",
    link:      "M10 13a5 5 0 007 0l3-3a5 5 0 10-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1",
    eye:       "M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z",
    play:      "M5 3l14 9-14 9z",
    pause:     "M6 4h4v16H6zM14 4h4v16h-4z",
    user:      "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
    refresh:   "M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0114.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0020.5 15",
    chat:      "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
    sparkle:   "M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8",
    inbox:     "M22 12h-6l-2 3h-4l-2-3H2M5.4 5.1L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.4-6.9A2 2 0 0016.8 4H7.2a2 2 0 00-1.8 1.1z",
    filter:    "M22 3H2l8 9.5V19l4 2v-8.5z",
    download:  "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
    trash:     "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
    edit:      "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.1 2.1 0 113 3L12 15l-4 1 1-4z",
    flask:     "M10 2v7.3L4.9 19A2 2 0 006.6 22h10.8a2 2 0 001.7-3L14 9.3V2M8 2h8",
    location:  "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0zM12 13a3 3 0 100-6 3 3 0 000 6z",
    camera:    "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z",
    image:     "M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21",
    upload:    "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
    lock:      "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM17 11V7a5 5 0 00-10 0v4",
    unlock:    "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM17 11V7a5 5 0 00-9.9-1",
    copy:      "M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
      <path d={paths[name] || ""} />
    </svg>
  );
};

// Skeleton loader
export const Skel = ({ w = "100%", h = 16, r = 6, style }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: `linear-gradient(90deg, ${T.bgSoft} 25%, ${T.line} 50%, ${T.bgSoft} 75%)`, backgroundSize: "200% 100%", animation: "skel 1.4s ease infinite", ...style }} />
);

// Inject skeleton keyframe once
if (typeof document !== 'undefined' && !document.getElementById("skel-kf")) {
  const s = document.createElement("style");
  s.id = "skel-kf";
  s.textContent = "@keyframes skel { 0%{background-position:200% 0} 100%{background-position:-200% 0} }";
  document.head.appendChild(s);
}

// ── Toast system ──
export const showToast = (msg, tone = "neutral") => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg, tone } }));
  }
};

export function ToastHost() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const handleShowToast = (e) => {
      const id = Date.now() + Math.random();
      setToasts(t => [...t, { id, ...e.detail }]);
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('show-toast', handleShowToast);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('show-toast', handleShowToast);
      }
    };
  }, []);
  if (!toasts.length) return null;
  const toneStyle = { neutral: { bg: T.ink, fg: T.bg }, good: { bg: T.good, fg: "#fff" }, bad: { bg: T.bad, fg: "#fff" }, warn: { bg: T.warn, fg: T.ink } };
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:300, display:"flex", flexDirection:"column", gap:8, pointerEvents:"none" }}>
      {toasts.map(t => {
        const s = toneStyle[t.tone] || toneStyle.neutral;
        return (
          <div key={t.id} style={{ padding:"10px 16px", background:s.bg, color:s.fg, borderRadius:8, fontFamily:T.fontSans, fontSize:13, fontWeight:500, boxShadow:"0 4px 16px rgba(0,0,0,0.15)", maxWidth:320 }}>
            {t.msg}
          </div>
        );
      })}
    </div>
  );
}

// ── Modal system ──
export const openModal = (content) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-modal', { detail: { content } }));
  }
};
export const closeModal = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-modal', { detail: { content: null } }));
  }
};

export function ModalHost() {
  const [content, setContent] = useState(null);
  useEffect(() => {
    const handleOpenModal = (e) => {
      setContent(e.detail.content);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('open-modal', handleOpenModal);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('open-modal', handleOpenModal);
      }
    };
  }, []);
  if (!content) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={e => e.target === e.currentTarget && closeModal()}>
      <div style={{ position:"absolute", inset:0, background:"oklch(0.18 0.01 60 / 0.4)", backdropFilter:"blur(4px)" }} onClick={closeModal} />
      <div style={{ position:"relative", background:T.bgElev, borderRadius:12, border:`1px solid ${T.line}`, boxShadow:"0 24px 48px -8px rgba(0,0,0,0.18)", width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto" }}>
        {content}
      </div>
    </div>
  );
}
