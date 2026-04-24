import React, { useState, useEffect } from 'react';
import { T, Ico, Label, Mono } from './primitives.jsx';

const NAV = [
  { group: "Overview", items: [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" }
  ]},
  { group: "Agent", items: [
    { id: "autopilot", label: "Autopilot",  icon: "autopilot", live: true },
    { id: "chat",      label: "Synapse AI", icon: "ai" },
    { id: "audit",     label: "Audit log",  icon: "inbox" }
  ]},
  { group: "Content", items: [
    { id: "posts",   label: "Posts",   icon: "posts" },
    { id: "reviews", label: "Reviews", icon: "reviews" },
    { id: "media",   label: "Media",   icon: "media" }
  ]},
  { group: "Profile", items: [
    { id: "services",  label: "Services",  icon: "services"  },
    { id: "analytics", label: "Analytics", icon: "analytics" }
  ]},
  { group: "Links", items: [
    { id: "liveGbp", label: "Live GBP", icon: "external", href: "https://www.google.com/viewer/place?client=ms-android-att-us-revc&hs=TN5U&sca_esv=17de63e8a22fe1ba&output=search&mid=/g/11wvfgz2ff&pip=CgplYXIgZG9jdG9yEAI%3D&lqi=ChJlYXIgZG9jdG9yIG5lYXIgbWUiA5ABAUitk7zX6buAgAhaHhAAEAEYABgCGAMiEmVhciBkb2N0b3IgbmVhciBtZZIBFW90b2xhcnluZ29sb2d5X2NsaW5pY5oBRENpOURRVWxSUVVOdlpFTm9kSGxqUmpsdlQyNUJNRmd6UW5WaE0xcERWRmhLVEUxRE1XMVdNSFJ0VW01U1ZWcEhZeEFCqgFLEAEqDiIKZWFyIGRvY3RvcigAMh8QASIbTZam58VKkQbxnrMLn1rxplER0Zicr6BfoS8hMhYQAiISZWFyIGRvY3RvciBuZWFyIG1l-gEFCJsDEDE&phdesc=7QxRf73cFnA&sa=X&ved=2ahUKEwi46ZKYq4CUAxXGfKQEHX4ZM0oQkbkFegQIJRAE" },
    { id: "settings", label: "Settings", icon: "settings" }
  ]}
];

export function Sidebar({ view, setView, open, onClose, isMobile, reviewBadge, businessName, businessLocation }) {
  const width = 236;
  const base = { width, flexShrink:0, background:T.bgSoft, borderRight:`1px solid ${T.line}`, display:"flex", flexDirection:"column", height:"100vh", transition:"transform 0.25s ease, margin-left 0.25s ease" };
  const desktopStyle = { ...base, position:"sticky", top:0, marginLeft: open ? 0 : -width };
  const mobileStyle  = { ...base, position:"fixed", top:0, left:0, zIndex:40, boxShadow: open ? "0 10px 40px oklch(0.18 0.01 60 / 0.15)" : "none", transform: open ? "translateX(0)" : `translateX(-${width}px)` };

  return (
    <aside style={isMobile ? mobileStyle : desktopStyle}>
      {/* Logo */}
      <div style={{ padding:"20px 20px 24px", display:"flex", alignItems:"center", gap:10, justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:26, height:26, borderRadius:7, background:T.ink, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
            <div style={{ width:11, height:11, borderRadius:"50%", border:`1.5px solid ${T.accent}` }} />
            <div style={{ position:"absolute", width:4, height:4, borderRadius:"50%", background:T.accent }} />
          </div>
          <div>
            <div style={{ fontFamily:T.fontDisp, fontSize:20, lineHeight:1, letterSpacing:"-0.01em" }}>Synapse</div>
            <div style={{ fontFamily:T.fontMono, fontSize:9, letterSpacing:"0.12em", textTransform:"uppercase", color:T.ink60, marginTop:2 }}>GBP Command</div>
          </div>
        </div>
        {isMobile && (
          <button onClick={onClose} aria-label="Close menu" style={{ width:30, height:30, borderRadius:6, border:`1px solid ${T.line}`, background:T.bgElev, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <Ico name="x" size={14} color={T.ink70} />
          </button>
        )}
      </div>

      {/* Business chip */}
      <div style={{ margin:"0 12px 20px", padding:"10px 12px", border:`1px solid ${T.line}`, borderRadius:8, background:T.bgElev }}>
        <div style={{ fontSize:12, fontWeight:500, lineHeight:1.2 }}>{businessName}</div>
        <Mono size={10} style={{ marginTop:2 }}>{businessLocation} · GBP</Mono>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:"0 10px", overflowY:"auto" }}>
        {NAV.map(section => (
          <div key={section.group} style={{ marginBottom:16 }}>
            <div style={{ padding:"6px 10px" }}><Label>{section.group}</Label></div>
            {section.items.map(it => {
              const active = view === it.id;
              const badge = it.id === "reviews" && reviewBadge > 0 ? reviewBadge : null;
              return (
                <div key={it.id} onClick={() => it.href ? window.open(it.href, '_blank') : setView(it.id)} style={{ padding:"7px 10px", borderRadius:6, marginBottom:1, display:"flex", alignItems:"center", gap:10, fontSize:13, fontWeight:500, cursor:"pointer", background: active ? T.bgElev : "transparent", color: active ? T.ink : T.ink70, border:`1px solid ${active ? T.line : "transparent"}`, transition:"background 0.12s" }}
                  onMouseOver={e => !active && (e.currentTarget.style.background = "oklch(0.94 0.008 75)")}
                  onMouseOut={e =>  !active && (e.currentTarget.style.background = "transparent")}>
                  <Ico name={it.icon} size={15} color={active ? T.accent : T.ink60} />
                  <span style={{ flex:1 }}>{it.label}</span>
                  {it.live && <span style={{ width:6, height:6, borderRadius:"50%", background:T.good, boxShadow:`0 0 0 3px ${T.goodSoft}` }} />}
                  {badge && <span style={{ fontFamily:T.fontMono, fontSize:10, color:T.accent, background:T.accentSoft, padding:"1px 6px", borderRadius:3 }}>{badge}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding:14, borderTop:`1px solid ${T.line}`, fontSize:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:"50%", background:T.accent, color:T.bg, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, fontSize:11 }}>FJ</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:500, lineHeight:1.2 }}>FAHAD JUMA</div>
            <Mono size={10}>FOUNDER</Mono>
          </div>
        </div>
        <div style={{ marginTop:10, display:"flex", gap:8 }}>
          <a href="/home.html" target="_blank" style={{ fontFamily:T.fontMono, fontSize:10, color:T.ink60, textDecoration:"none" }}>Home</a>
          <span style={{ color:T.line }}>·</span>
          <a href="/privacy.html" target="_blank" style={{ fontFamily:T.fontMono, fontSize:10, color:T.ink60, textDecoration:"none" }}>Privacy</a>
          <span style={{ color:T.line }}>·</span>
          <a href="/terms.html" target="_blank" style={{ fontFamily:T.fontMono, fontSize:10, color:T.ink60, textDecoration:"none" }}>Terms</a>
        </div>
      </div>
    </aside>
  );
}

export function Topbar({ view, title, sub, right, onMenu, sidebarOpen, isMobile, canGoBack, goBack, onHome, onSearch }) {
  const navBtnStyle = { width:36, height:36, borderRadius:8, border:`1px solid ${T.line}`, background:T.bgElev, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, padding:0, transition:"background 0.15s" };
  return (
    <div style={{ position:"sticky", top:0, zIndex:10, background:`color-mix(in oklch, ${T.bg} 88%, transparent)`, backdropFilter:"blur(12px)", borderBottom:`1px solid ${T.line}`, padding: isMobile ? "14px 18px" : "16px 32px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
        {/* Hamburger */}
        <button onClick={onMenu} aria-label="Toggle sidebar" style={{ ...navBtnStyle, background: sidebarOpen ? T.bgSoft : T.bgElev }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="1.75" strokeLinecap="round">
            <line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>
          </svg>
        </button>
        {/* Back button — visible only when there is navigation history */}
        {canGoBack && (
          <button onClick={goBack} aria-label="Go back" style={navBtnStyle}
            onMouseOver={e => e.currentTarget.style.background = T.bgSoft}
            onMouseOut={e => e.currentTarget.style.background = T.bgElev}>
            <Ico name="arrowLeft" size={14} color={T.ink70} />
          </button>
        )}
        {/* Home button — always visible */}
        <button onClick={onHome} aria-label="Go to dashboard" style={{ ...navBtnStyle, background: view === "dashboard" ? T.bgSoft : T.bgElev }}
          onMouseOver={e => e.currentTarget.style.background = T.bgSoft}
          onMouseOut={e => e.currentTarget.style.background = view === "dashboard" ? T.bgSoft : T.bgElev}>
          <Ico name="home" size={14} color={view === "dashboard" ? T.accent : T.ink70} />
        </button>
        {/* Title block */}
        <div style={{ minWidth:0 }}>
          {!isMobile && (
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <Mono size={11}>synapse / {view}</Mono>
              <span style={{ width:6, height:6, borderRadius:"50%", background:T.good }} />
              <Mono size={10} color={T.good}>AUTOPILOT ON</Mono>
            </div>
          )}
          <div style={{ fontFamily:T.fontDisp, fontSize: isMobile ? 22 : 28, letterSpacing:"-0.02em", marginTop: isMobile ? 0 : 4, lineHeight:1.1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{title}</div>
          {sub && !isMobile && <div style={{ fontSize:13, color:T.ink70, marginTop:4 }}>{sub}</div>}
        </div>
      </div>
      <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
        {/* Mobile search icon */}
        {isMobile && (
          <button onClick={onSearch} aria-label="Search" style={navBtnStyle}
            onMouseOver={e => e.currentTarget.style.background = T.bgSoft}
            onMouseOut={e => e.currentTarget.style.background = T.bgElev}>
            <Ico name="search" size={15} color={T.ink70} />
          </button>
        )}
        {right}
      </div>
    </div>
  );
}

