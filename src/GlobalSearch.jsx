import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { API } from './data.jsx';
import { T, Ico, Pill, Mono, Skel, closeModal } from './primitives.jsx';

const TYPE_META = {
  review:  { label: "Review",  icon: "reviews",  tone: "warn"    },
  post:    { label: "Post",    icon: "posts",    tone: "accent"  },
  service: { label: "Service", icon: "services", tone: "good"    },
  profile: { label: "Profile", icon: "user",     tone: "neutral" },
};

const SECTIONS = ["review", "post", "service", "profile"];

export function GlobalSearch({ reviews, onNavigate }) {
  const [query, setQuery]           = useState("");
  const [posts, setPosts]           = useState([]);
  const [services, setServices]     = useState([]);
  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      API.posts().catch(() => ({ posts: [] })),
      API.services().catch(() => ({ services: [] })),
      API.profile().catch(() => null),
    ]).then(([postsData, servicesData, profileData]) => {
      if (cancelled) return;
      setPosts(postsData.posts || []);
      setServices(servicesData.services || []);
      setProfile(profileData?.profile || profileData || null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out = [];

    reviews.forEach(r => {
      const reviewer = (r.reviewer || "").toLowerCase();
      const comment  = (r.comment  || "").toLowerCase();
      if (reviewer.includes(q) || comment.includes(q)) {
        out.push({
          type: "review",
          viewId: "reviews",
          label: r.reviewer || "Anonymous",
          sub: (r.comment || "").slice(0, 90),
          id: r.reviewId || r.id || Math.random(),
        });
      }
    });

    posts.forEach(p => {
      const text = (p.summary || p.text || "").toLowerCase();
      if (text.includes(q)) {
        out.push({
          type: "post",
          viewId: "posts",
          label: (p.summary || p.text || "").slice(0, 70) || "(untitled post)",
          sub: null,
          id: p.postId || p.id || Math.random(),
        });
      }
    });

    services.forEach(s => {
      const name = (s.displayName || "").toLowerCase();
      const desc = (s.description || "").toLowerCase();
      if (name.includes(q) || desc.includes(q)) {
        out.push({
          type: "service",
          viewId: "services",
          label: s.displayName || "(unnamed service)",
          sub: (s.description || "").slice(0, 70),
          id: s.displayName || Math.random(),
        });
      }
    });

    if (profile) {
      const title = (profile.title || "").toLowerCase();
      const desc  = (profile.description || "").toLowerCase();
      const addr  = (profile.address?.street || "").toLowerCase();
      if (title.includes(q) || desc.includes(q) || addr.includes(q)) {
        out.push({
          type: "profile",
          viewId: "settings",
          label: profile.title || "Business Profile",
          sub: (profile.description || profile.address?.city || "").slice(0, 90),
          id: "profile",
        });
      }
    }

    return out;
  }, [query, reviews, posts, services, profile]);

  useEffect(() => {
    setActiveIndex(results.length > 0 ? 0 : -1);
  }, [results.length]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && results[activeIndex]) {
        onNavigate(results[activeIndex].viewId);
      }
    } else if (e.key === "Escape") {
      closeModal();
    }
  }, [results, activeIndex, onNavigate]);

  return (
    <div style={{ display: "flex", flexDirection: "column", maxHeight: "80vh" }}>

      {/* Search input row */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 16px",
        borderBottom: `1px solid ${T.line}`,
      }}>
        <Ico name="search" size={16} color={T.ink60} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search reviews, posts, services, profile…"
          style={{
            flex: 1, border: "none", outline: "none",
            fontSize: 15, fontFamily: T.fontSans,
            background: "transparent", color: T.ink,
          }}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", padding: 0 }}>
            <Ico name="x" size={14} color={T.ink60} />
          </button>
        )}
        <span style={{
          fontFamily: T.fontMono, fontSize: 10,
          padding: "2px 6px", borderRadius: 4,
          border: `1px solid ${T.lineStrong}`,
          color: T.ink60, letterSpacing: "0.04em",
        }}>ESC</span>
      </div>

      {/* Results area */}
      <div style={{ overflowY: "auto", flex: 1 }}>

        {loading && (
          <div style={{ padding: "16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            <Skel h={44} />
            <Skel h={44} />
            <Skel h={44} />
          </div>
        )}

        {!loading && !query && (
          <div style={{ padding: "36px 20px", textAlign: "center" }}>
            <Ico name="search" size={28} color={T.ink40} />
            <div style={{ marginTop: 12, fontSize: 13, color: T.ink60, fontFamily: T.fontSans }}>
              Search across reviews, posts, services, and your business profile.
            </div>
            <Mono size={11} style={{ marginTop: 6, display: "block" }}>
              Try: a patient name, service name, or keyword
            </Mono>
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <div style={{ padding: "36px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: T.ink60, fontFamily: T.fontSans }}>No results for</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: T.ink, marginTop: 4 }}>"{query}"</div>
          </div>
        )}

        {!loading && results.length > 0 && SECTIONS.map(type => {
          const group = results.filter(r => r.type === type);
          if (group.length === 0) return null;
          const meta = TYPE_META[type];
          return (
            <div key={type}>
              <div style={{
                padding: "8px 16px 4px",
                display: "flex", alignItems: "center", gap: 8,
                borderTop: `1px solid ${T.line}`,
                background: T.bgSoft,
              }}>
                <Ico name={meta.icon} size={11} color={T.ink60} />
                <Mono size={10}>{meta.label}s</Mono>
                <Mono size={10} color={T.ink40}>· {group.length}</Mono>
              </div>
              {group.map(item => {
                const isActive = results.indexOf(item) === activeIndex;
                return (
                  <div
                    key={String(item.id)}
                    onClick={() => onNavigate(item.viewId)}
                    onMouseEnter={() => setActiveIndex(results.indexOf(item))}
                    style={{
                      padding: "10px 16px",
                      display: "flex", alignItems: "flex-start", gap: 12,
                      cursor: "pointer",
                      background: isActive ? T.accentSoft : "transparent",
                      borderLeft: isActive ? `3px solid ${T.accent}` : "3px solid transparent",
                      transition: "background 0.1s",
                    }}>
                    <Pill tone={meta.tone}>{meta.label}</Pill>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 500, color: T.ink,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {item.label}
                      </div>
                      {item.sub && (
                        <div style={{
                          fontSize: 12, color: T.ink60, marginTop: 2,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {item.sub}
                        </div>
                      )}
                    </div>
                    <Ico name="arrow" size={12} color={T.ink40} style={{ flexShrink: 0, marginTop: 2 }} />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: "8px 16px",
        borderTop: `1px solid ${T.line}`,
        display: "flex", gap: 16, background: T.bgSoft,
      }}>
        <Mono size={10}>↑↓ navigate</Mono>
        <Mono size={10}>↵ open</Mono>
        <Mono size={10}>esc close</Mono>
        {!loading && results.length > 0 && (
          <Mono size={10} style={{ marginLeft: "auto" }}>{results.length} result{results.length !== 1 ? "s" : ""}</Mono>
        )}
      </div>

    </div>
  );
}
