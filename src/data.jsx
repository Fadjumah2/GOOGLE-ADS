// Synapse — API client (replaces MOCK data)
const STORAGE_KEY = "synapse-api-key";

export const API = {
  getKey: () => localStorage.getItem(STORAGE_KEY) || "",
  setKey: (k) => localStorage.setItem(STORAGE_KEY, k.trim()),
  clearKey: () => localStorage.removeItem(STORAGE_KEY),

  call: async (path, opts = {}) => {
    const res = await fetch(path, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API.getKey(),
        ...(opts.headers || {})
      }
    });
    if (res.status === 401) {
      API.clearKey();
      window.dispatchEvent(new CustomEvent("synapse-unauthorized"));
      throw Object.assign(new Error("Unauthorized"), { status: 401 });
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || json.message || `HTTP ${res.status}`);
    return json;
  },

  // ── GBP ──
  profile:       ()             => API.call("/api/gbp/getProfile"),
  reviews:       ()             => API.call("/api/gbp/fetchReviews"),
  posts:         ()             => API.call("/api/gbp/getPosts"),
  insights:      (p = "last28") => API.call(`/api/gbp/getInsights?period=${p}`),
  services:      ()             => API.call("/api/gbp/getServiceList"),
  media:         ()             => API.call("/api/gbp/listMedia"),
  replyToReview: (name, txt)    => API.call("/api/gbp/replyToReview",  { method: "POST", body: JSON.stringify({ reviewName: name, comment: txt }) }),
  createPost:    (body)         => API.call("/api/gbp/createPost",      { method: "POST", body: JSON.stringify(body) }),
  addService:    (body)         => API.call("/api/gbp/addService",       { method: "POST", body: JSON.stringify(body) }),
  uploadMedia:   (body)         => API.call("/api/gbp/uploadMedia",     { method: "POST", body: JSON.stringify(body) }),
  getSignedUrl:  (filename, contentType) => API.call("/api/gbp/getSignedUrl",  { method: "POST", body: JSON.stringify({ filename, contentType }) }),

  // ── Agent ──
  chat:        (message, history) => API.call("/api/agent/chat",             { method: "POST", body: JSON.stringify({ message, history }) }),
  apStatus:    ()                 => API.call("/api/agent/status"),
  auditLog:    (limit = 150)      => API.call(`/api/agent/auditLog?limit=${limit}`),
  runDaily:    (opts = {})        => API.call("/api/agent/runDaily",          { method: "POST", body: JSON.stringify(opts) }),
  previewPost: ()                 => API.call("/api/agent/autonomousPost",    { method: "POST", body: JSON.stringify({ dryRun: true }) }),
  autoReply:   (opts = {})        => API.call("/api/agent/autoReplyReviews", { method: "POST", body: JSON.stringify(opts) }),
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

