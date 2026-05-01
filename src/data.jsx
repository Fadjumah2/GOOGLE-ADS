// Synapse — API client (replaces MOCK data)
export const API = {
  call: async (apiKey, path, opts = {}) => {
    if (import.meta.env.DEV) console.log(`[API] ${opts.method || 'GET'} ${path}`);
    try {
      const res = await fetch(path, {
        ...opts,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          ...(opts.headers || {})
        }
      });
      if (import.meta.env.DEV) console.log(`[API] Response: ${res.status} ${res.statusText}`);

      if (res.status === 401) {
        if (import.meta.env.DEV) console.error('[API] Unauthorized - clearing key and re-prompting');
        window.dispatchEvent(new CustomEvent("synapse-unauthorized"));
        throw Object.assign(new Error("Unauthorized - please re-enter your API key"), { status: 401 });
      }
      const raw = await res.text();
      let json = {};
      try { json = raw ? JSON.parse(raw) : {}; } catch {}
      if (!res.ok) {
        const textMsg = typeof raw === "string" ? raw.trim() : "";
        const errMsg = json.error || json.message || (textMsg && !textMsg.startsWith("<") ? textMsg.slice(0, 200) : "") || `HTTP ${res.status}`;
        if (import.meta.env.DEV) console.error(`[API] Error: ${errMsg}`);
        throw new Error(errMsg);
      }
      return json;
    } catch (e) {
      if (import.meta.env.DEV) console.error(`[API] Exception on ${path}:`, e);
      throw e;
    }
  },

  // ── GBP ──
  profile:       (apiKey)             => API.call(apiKey, "/api/gbp/getProfile"),
  reviews:       (apiKey)             => API.call(apiKey, "/api/gbp/fetchReviews"),
  posts:         (apiKey)             => API.call(apiKey, "/api/gbp/getPosts"),
  insights:      (apiKey, p = "last28") => API.call(apiKey, `/api/gbp/getInsights?period=${p}`),
  services:      (apiKey)             => API.call(apiKey, "/api/gbp/getServiceList"),
  media:         (apiKey)             => API.call(apiKey, "/api/gbp/listMedia"),
  replyToReview: (apiKey, name, txt)    => API.call(apiKey, "/api/gbp/replyToReview",  { method: "POST", body: JSON.stringify({ reviewName: name, comment: txt }) }),
  createPost:    (apiKey, body)         => API.call(apiKey, "/api/gbp/createPost",      { method: "POST", body: JSON.stringify(body) }),
  addService:    (apiKey, body)         => API.call(apiKey, "/api/gbp/addService",       { method: "POST", body: JSON.stringify(body) }),
  uploadMedia:   (apiKey, body)         => API.call(apiKey, "/api/gbp/uploadMedia",     { method: "POST", body: JSON.stringify(body) }),
  getSignedUrl:  (apiKey, filename, contentType) => API.call(apiKey, "/api/gbp/getSignedUrl",  { method: "POST", body: JSON.stringify({ filename, contentType }) }),

  // ── Agent ──
  getStrategy: (apiKey)                 => API.call(apiKey, "/api/agent/getStrategy"),
  updateStrategy: (apiKey, strategy)      => API.call(apiKey, "/api/agent/updateStrategy",    { method: "POST", body: JSON.stringify({ strategy }) }),
  getDrafts:   (apiKey)                 => API.call(apiKey, "/api/agent/getDrafts"),
  getSentiment: (apiKey)                => API.call(apiKey, "/api/agent/getSentiment"),
  getReport:    (apiKey, period)          => API.call(apiKey, `/api/agent/getReport?period=${period}`),
  approveDraft: (apiKey, draftId)         => API.call(apiKey, "/api/agent/approveDraft",      { method: "POST", body: JSON.stringify({ draftId }) }),
  deleteDraft:  (apiKey, draftId)         => API.call(apiKey, "/api/agent/deleteDraft",       { method: "POST", body: JSON.stringify({ draftId }) }),
  chat:        (apiKey, message, history) => API.call(apiKey, "/api/agent/chat",             { method: "POST", body: JSON.stringify({ message, history }) }),
  apStatus:    (apiKey)                 => API.call(apiKey, "/api/agent/status"),
  auditLog:    (apiKey, limit = 150)      => API.call(apiKey, `/api/agent/auditLog?limit=${limit}`),
  runDaily:    (apiKey, opts = {})        => API.call(apiKey, "/api/agent/runDaily",          { method: "POST", body: JSON.stringify(opts) }),
  previewPost: (apiKey)                 => API.call(apiKey, "/api/agent/autonomousPost",    { method: "POST", body: JSON.stringify({ dryRun: true }) }),
  autoReply:   (apiKey, opts = {})        => API.call(apiKey, "/api/agent/autoReplyReviews", { method: "POST", body: JSON.stringify(opts) }),
};

// ── Helpers ──

export function starNum(rating) {
  if (typeof rating === "number") return rating;
  const map = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
  return map[String(rating).toUpperCase()] || 0;
}

export function starStr(n) {
  const s = starNum(n);
  return "★".repeat(s) + "☆".repeat(5 - s);
}

export function relTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString("en-UG", { day: "numeric", month: "short" });
}

export function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-UG", { month: "short", day: "numeric" });
}

export function sparkFrom(entry, n = 14) {
  if (!entry?.raw) return Array(n).fill(0);
  const vals = entry.raw.map(d => parseInt(d.value, 10) || 0);
  while (vals.length < n) vals.unshift(0);
  return vals.slice(-n);
}

export function findMetric(insights, ...nameParts) {
  return insights.find(m => nameParts.some(np => (m.metric || "").includes(np)));
}

export function metricLabel(m) {
  const labels = {
    BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: "Desktop views",
    BUSINESS_IMPRESSIONS_MOBILE_SEARCH:  "Mobile views",
    BUSINESS_IMPRESSIONS_DESKTOP_MAPS:   "Maps (desktop)",
    BUSINESS_IMPRESSIONS_MOBILE_MAPS:    "Maps (mobile)",
    BUSINESS_DIRECTION_REQUESTS:         "Direction requests",
    CALL_CLICKS:                         "Calls",
    WEBSITE_CLICKS:                      "Website clicks",
    BUSINESS_CONVERSATIONS:              "Conversations",
    BUSINESS_BOOKINGS:                   "Bookings",
  };
  return labels[m] || m.toLowerCase().replace(/_/g, " ");
}

export function auditTypeLabel(type) {
  return type.replace(/^autopilot\./, "").replace(/\./g, ".");
}

export function fmtNum(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}
