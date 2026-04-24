import React, { useState, useEffect } from 'react';
import { API } from './data.jsx';
import { T, Btn, Ico, ModalHost, ToastHost, openModal, closeModal, showToast } from './primitives.jsx';
import { GlobalSearch } from './GlobalSearch.jsx';
import { Sidebar, Topbar } from './shell.jsx';
import { AutopilotView, ChatView, AuditView, PostsView, ReviewsView, MediaView, ServicesView, AnalyticsView, SettingsView } from './views.jsx';
import { DashboardView } from './dashboard.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    console.error('React Error Boundary caught:', error);
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Component stack:', errorInfo.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, color: '#c41e3a', fontFamily: 'system-ui' }}>
          <h2>App crashed</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', cursor: 'pointer' }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

class ViewErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(e) {
    return { hasError: true, error: e };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 48, textAlign: 'center', fontFamily: T.fontSans }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: T.bad }}>This page encountered an error.</div>
          <div style={{ fontSize: 13, color: T.ink60, marginTop: 6 }}>{this.state.error?.message}</div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer', border: `1px solid ${T.lineStrong}`, borderRadius: 6, background: T.bgElev, fontFamily: T.fontSans, fontSize: 13 }}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.innerWidth < 900);
  useEffect(() => {
    const onR = () => setM(window.innerWidth < 900);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  return m;
}

function ApiKeyModal() {
  const [key, setKey] = useState("");

  const handleSubmit = () => {
    if (key.trim()) {
      API.setKey(key);
      window.location.reload();
    } else {
      showToast("Please enter an API key", "bad");
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 8 }}>Authenticate</div>
        <div style={{ fontSize: 14, color: T.ink70 }}>Enter your Synapse API key to access the dashboard.</div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: T.ink60, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>API Key</label>
        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          placeholder="Paste your API key here"
          style={{
            width: "100%",
            padding: "10px 12px",
            border: `1px solid ${T.line}`,
            borderRadius: 6,
            fontFamily: T.fontMono,
            fontSize: 13,
            boxSizing: "border-box"
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <Btn tone="solid" style={{ flex: 1 }} onClick={handleSubmit}>Continue</Btn>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState(() => localStorage.getItem("synapse-view") || "dashboard");
  const [viewHistory, setViewHistory] = useState([]);
  useEffect(() => localStorage.setItem("synapse-view", view), [view]);

  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    API.reviews()
      .then(data => setReviews(data.reviews || []))
      .catch(e => {
        console.error('Failed to fetch reviews:', e);
        setReviews([]);
      });
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState(Date.now());

  const totalReviews = reviews.length;
  const unansweredReviews = reviews.filter(r => !r.hasReply).length;

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const businessName = "Eritage ENT Care";
  const businessLocation = "Entebbe, Uganda";

  const VIEWS = {
    dashboard: { title: "Today at a glance", sub: `${formattedDate} · ${businessName} · ${businessLocation}`, Comp: DashboardView },
    autopilot: { title: "Autopilot", sub: "Autonomous daily posting & safe review replies.", Comp: AutopilotView },
    chat: { title: "Synapse AI", sub: "Conversational agent with 14 GBP tools.", Comp: ChatView },
    audit: { title: "Audit log", sub: "Every autonomous action, timestamped.", Comp: AuditView },
    posts: { title: "Posts", sub: "Your published Google posts.", Comp: PostsView },
    reviews: { title: "Reviews", sub: `${totalReviews} total · ${unansweredReviews} awaiting action.`, Comp: ReviewsView },
    media: { title: "Media", sub: "Photos and videos on your listing.", Comp: MediaView },
    services:  { title: "Services",  sub: "What patients see when they search.", Comp: ServicesView },
    analytics: { title: "Analytics", sub: "Trends, response times, rating distribution.", Comp: AnalyticsView },
    settings:  { title: "Settings",  sub: "API key, business info, and feature flags.", Comp: SettingsView },
  };

  const isMobile = useIsMobile();
  // Sidebar: open by default on desktop, closed by default on mobile. Persisted.
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("synapse-sidebar");
    if (saved !== null) return saved === "1";
    return typeof window !== "undefined" ? window.innerWidth >= 900 : true;
  });
  useEffect(() => localStorage.setItem("synapse-sidebar", sidebarOpen ? "1" : "0"), [sidebarOpen]);

  // When switching to mobile, auto-close the drawer so it doesn't cover content.
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  // Check for API key on mount and listen for unauthorized
  useEffect(() => {
    const checkAuth = () => {
      if (!API.getKey()) {
        console.log('[Auth] No API key found, opening auth modal');
        openModal(<ApiKeyModal />);
      } else {
        console.log('[Auth] API key found, proceeding');
      }
    };
    checkAuth();

    const handleUnauthorized = (e) => {
      console.log('[Auth] Unauthorized event received, prompting for new key');
      openModal(<ApiKeyModal />);
    };

    window.addEventListener("synapse-unauthorized", handleUnauthorized);

    // Global error handler for uncaught promise rejections
    const handleUnhandledRejection = (e) => {
      console.error('[Global] Unhandled promise rejection:', e.reason);
      showToast(`Error: ${e.reason?.message || e.reason}`, "bad");
    };
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("synapse-unauthorized", handleUnauthorized);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  const cfg = VIEWS[view];
  const Comp = cfg.Comp;

  const pickView = (v) => {
    if (v !== view) setViewHistory(h => [...h, view]);
    setView(v);
    if (isMobile) setSidebarOpen(false);
  };

  const goBack = () => {
    setViewHistory(h => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setView(prev);
      if (isMobile) setSidebarOpen(false);
      return h.slice(0, -1);
    });
  };

  const canGoBack = viewHistory.length > 0;

  const handleRunNow = async () => {
    try {
      await API.runDaily();
      showToast("Daily cycle started — refresh in a minute to see results.", "good");
    } catch(e) { showToast(e.message, "bad"); }
  };

  const openSearch = () => {
    openModal(
      <GlobalSearch
        reviews={reviews}
        onNavigate={(viewId) => { closeModal(); pickView(viewId); }}
      />
    );
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [reviews]);

  const topbarRight = (
    <>
      {!isMobile && (
        <button
          onClick={openSearch}
          aria-label="Global search (⌘K)"
          title="Search everything  ⌘K"
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", border: `1px solid ${T.line}`, borderRadius: 6, background: T.bgElev, cursor: "pointer", color: T.ink60, fontFamily: T.fontSans, fontSize: 12 }}>
          <Ico name="search" size={13} color={T.ink60} />
          <span>Search…</span>
          <span style={{ fontFamily: T.fontMono, fontSize: 10, padding: "1px 5px", borderRadius: 4, border: `1px solid ${T.lineStrong}`, color: T.ink60, letterSpacing: "0.04em" }}>⌘K</span>
        </button>
      )}
      {!isMobile && <Btn size="sm" onClick={() => setLastRefreshed(Date.now())}><Ico name="refresh" size={12} /> Sync</Btn>}
      <Btn size="sm" tone="solid" onClick={handleRunNow}>
        <Ico name="bolt" size={12} />
        {isMobile ? "Run" : "Run daily cycle"}
      </Btn>
    </>
  );

  const content = (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      background: T.bg,
      color: T.ink,
      fontFamily: T.fontSans,
      fontSize: 14,
      position: "relative"
    }}>
      {/* Backdrop for mobile drawer */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 30,
            background: "oklch(0.18 0.01 60 / 0.4)",
            backdropFilter: "blur(2px)"
          }}
        />
      )}

      <Sidebar
        view={view}
        setView={pickView}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isMobile={isMobile}
        businessName={businessName}
        businessLocation={businessLocation}
      />

      <main style={{
        flex: 1, minWidth: 0,
        display: "flex", flexDirection: "column",
        width: "100%"
      }}>
        <Topbar
          view={view}
          title={cfg.title}
          sub={cfg.sub}
          right={topbarRight}
          onMenu={() => setSidebarOpen(o => !o)}
          sidebarOpen={sidebarOpen}
          isMobile={isMobile}
          canGoBack={canGoBack}
          goBack={goBack}
          onHome={() => pickView("dashboard")}
          onSearch={openSearch}
        />
        <div style={{ flex: 1 }}>
          <ViewErrorBoundary key={view}>
            <Comp isMobile={isMobile} reviews={reviews} searchTerm={searchTerm} lastRefreshed={lastRefreshed} onNavigate={pickView} />
          </ViewErrorBoundary>
        </div>
      </main>

      <ModalHost />
      <ToastHost />
    </div>
  );

  return <ErrorBoundary>{content}</ErrorBoundary>;
}

