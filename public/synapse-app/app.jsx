// Synapse Dashboard — root app
const { useState: uSA, useEffect: uEA } = React;

const VIEWS = {
  dashboard: { title: "Today at a glance", sub: "Saturday, April 20 · Eritage ENT Care · Entebbe", Comp: DashboardView },
  autopilot: { title: "Autopilot", sub: "Autonomous daily posting & safe review replies.", Comp: AutopilotView },
  chat: { title: "Synapse AI", sub: "Conversational agent with 14 GBP tools.", Comp: ChatView },
  audit: { title: "Audit log", sub: "Every autonomous action, timestamped.", Comp: AuditView },
  posts: { title: "Posts", sub: "Your published Google posts.", Comp: PostsView },
  reviews: { title: "Reviews", sub: "5 total · 3 awaiting action.", Comp: ReviewsView },
  media: { title: "Media", sub: "Photos and videos on your listing.", Comp: MediaView },
  services: { title: "Services", sub: "What patients see when they search.", Comp: ServicesView },
  analytics: { title: "Analytics", sub: "Trends, response times, rating distribution.", Comp: AnalyticsView }
};

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
  const [copied, setCopied] = useState(false);

  const handleSubmit = () => {
    if (key.trim()) {
      API.setKey(key);
      window.closeModal();
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

function App() {
  const [view, setView] = useState(() => localStorage.getItem("synapse-view") || "dashboard");
  useEffect(() => localStorage.setItem("synapse-view", view), [view]);

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
        openModal(<ApiKeyModal />);
      }
    };
    checkAuth();

    const handleUnauthorized = () => {
      openModal(<ApiKeyModal />);
    };

    window.addEventListener("synapse-unauthorized", handleUnauthorized);
    return () => window.removeEventListener("synapse-unauthorized", handleUnauthorized);
  }, []);

  const cfg = VIEWS[view];
  const Comp = cfg.Comp;

  const pickView = (v) => {
    setView(v);
    if (isMobile) setSidebarOpen(false);
  };

  const topbarRight = (
    <>
      {!isMobile && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", border: `1px solid ${T.line}`, borderRadius: 6, background: T.bgElev }}>
          <Ico name="search" size={13} color={T.ink60} />
          <Mono size={11} color={T.ink60}>Search · ⌘K</Mono>
        </div>
      )}
      {!isMobile && <Btn size="sm"><Ico name="refresh" size={12} /> Sync</Btn>}
      <Btn size="sm" tone="solid">
        <Ico name="bolt" size={12} />
        {isMobile ? "Run" : "Run daily cycle"}
      </Btn>
    </>
  );

  return (
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
        />
        <div style={{ flex: 1 }}>
          <Comp isMobile={isMobile} />
        </div>
      </main>

      <ModalHost />
      <ToastHost />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
