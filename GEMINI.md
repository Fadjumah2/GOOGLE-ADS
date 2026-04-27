# SYNAPSE MVP — GEMINI CODE ASSISTANT RULES

> These rules are MANDATORY. Read them before writing or modifying any code in
> this repository. Violating them breaks the live production app.

---

## Project Identity

- **Name:** Synapse MVP
- **Client:** Eritage ENT Care — a single ENT clinic in Entebbe, Uganda
- **Purpose:** Google Business Profile (GBP) management backend — reviews,
  posts, profile, services, media, insights, and an autonomous daily-posting
  agent.
- **This is NOT a SaaS product.** There is one business, one account, one
  location. Never introduce multi-tenant logic, tenant IDs, per-user
  databases, or any abstraction that implies more than one client.

---

## Stack — Do Not Change

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM — `"type": "module"` in package.json) |
| Framework | Express |
| HTTP client | `axios` + `https-proxy-agent` (proxy REQUIRED — see below) |
| Google APIs | `googleapis`, `@google-cloud/storage` |
| AI | `@google/generative-ai` (Gemini 2.5 Flash) |
| Auth | Service Account JSON key (preferred) OR OAuth 2.0 refresh token |
| Deploy | Vercel (serverless) |
| Entry point | `server.js` on port 3000 |

---

## HARD RULES — Never Break These

### 1. All Google API calls MUST go through `utils/gbpClient.js`
Every function that contacts a Google API lives in `utils/gbpClient.js`.
Never make raw `axios` or `googleapis` calls to Google from route handlers,
service files, or anywhere else. If a new GBP operation is needed, add a new
exported function to `utils/gbpClient.js` and call it from there.

### 2. The proxy is mandatory — never remove it
The deployment environment requires an HTTPS proxy. This is already wired in
`utils/gbpClient.js`:
```js
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
const httpsAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
const axiosConfig = httpsAgent ? { httpsAgent, proxy: false } : {};
```
Every `axios` call in `gbpClient.js` spreads `...axiosConfig`. Do not remove
this pattern. Do not add a new axios call without it.

### 3. Auth goes through `services/googleAuthService.js` only
`utils/gbpClient.js` calls `refreshAccessToken()` from
`services/googleAuthService.js`. That service handles the service-account vs
OAuth fallback priority automatically. Never call the Google auth APIs
directly from any other file. Never create a second auth path.

Auth priority (already implemented — do not change):
- If `GOOGLE_SERVICE_ACCOUNT_KEY_JSON` is set → use service account.
- Otherwise → use OAuth 2.0 refresh token (`GOOGLE_REFRESH_TOKEN`).

### 4. All API responses must be JSON
Every Express route returns `res.json(...)`. Never return plain text, HTML,
or redirect for API routes. Error responses must also be JSON:
```js
res.status(500).json({ error: 'DESCRIPTION', message: '...' });
```

### 5. Never bypass `middleware/requireApiKey.js`
Every `/api/*` route is protected by this middleware. It is registered in
`server.js` before all routes with:
```js
app.use('/api', requireApiKey);
```
Do not remove it. Do not add exceptions for individual routes. The only
public route is `/ping`.

### 6. The cron route uses a DIFFERENT auth method
`GET /api/cron/daily` is authenticated by an `Authorization: Bearer <CRON_SECRET>`
header — NOT the `x-api-key` header used by all other routes. This is
intentional (Vercel Cron sends Bearer tokens). Do not change this auth check.

### 7. Never add unnecessary abstractions or refactor working code
- Do not create new wrapper classes, factory functions, or service layers
  unless a task explicitly requires them.
- Do not rename existing functions or variables unless asked.
- Do not reorganize the directory structure.
- Do not split a working file into multiple files without a clear reason.
- Three similar lines of code are better than a premature abstraction.

### 8. Do not touch `utils/policyGuard.js` blocked-word lists without instruction
The policy guard enforces Google's GBP content rules. Its blocked words and
validation logic protect the clinic from Google policy violations. Never add,
remove, or relax those checks unless explicitly instructed.

### 9. The Q&A API is permanently discontinued
`fetchQuestions` and `replyToQuestion` in `gbpClient.js` intentionally return
a static `API_DISCONTINUED` error. The corresponding route handlers in
`server.js` return `410 Gone`. Do not attempt to call these APIs — they were
shut down by Google on November 3, 2025.

### 10. Idempotency for the daily post
`utils/autonomousAgent.js` calls `alreadyPostedToday()` before publishing a
post. This function queries the live GBP API. Do not add a local file/DB
cache as a replacement — the GBP query is the source of truth.

---

## File Structure — Do Not Reorganize

```
server.js                    — Express app; all routes registered here
vercel.json                  — Vercel config (cron schedule lives here)

/api/gbp/                    — One file per GBP route handler
  fetchReviews.js
  replyToReview.js
  getPosts.js
  createPost.js
  getProfile.js
  updateProfile.js
  getServiceList.js
  updateServiceList.js
  fetchQuestions.js          — Returns 410 (API discontinued)
  replyToQuestion.js         — Returns 410 (API discontinued)
  listMedia.js
  uploadMedia.js
  getInsights.js

/handlers/agent/             — Autopilot / AI agent route handlers
/handlers/cron/              — Vercel Cron entry point

/services/
  googleAuthService.js       — ONLY auth logic lives here

/utils/
  gbpClient.js               — ONLY file that calls Google APIs
  geminiClient.js            — Gemini AI client (chat + text generation)
  autonomousAgent.js         — Daily-post + auto-reply orchestrator
  policyGuard.js             — Content validation before any publish
  contentStrategy.js         — Weekly theme schedule
  auditLog.js                — Ring-buffer action log
  normalizeGBPResponse.js    — Response normalization helpers
  logger.js                  — Logging

/middleware/
  requireApiKey.js           — x-api-key auth for all /api/* routes

/public/                     — Static frontend assets
/src/                        — Frontend source
```

---

## Environment Variables

Do not hardcode any of these. Always read from `process.env.*`.

| Variable | Purpose |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_KEY_JSON` | Service account JSON key (single-line) |
| `GBP_CLIENT_ID` | OAuth client ID (fallback auth) |
| `GBP_CLIENT_SECRET` | OAuth client secret (fallback auth) |
| `GOOGLE_REFRESH_TOKEN` | OAuth refresh token (fallback auth) |
| `GOOGLE_REDIRECT_URI` | OAuth redirect URI |
| `GBP_ACCOUNT_ID` | Google Business Account ID (with or without `accounts/` prefix) |
| `GBP_LOCATION_ID` | Google Business Location ID (with or without `locations/` prefix) |
| `GEMINI_API_KEY` | Google Generative AI key for Gemini |
| `API_KEY` | Shared secret for `x-api-key` header (all /api/* routes) |
| `CRON_SECRET` | Bearer token for `/api/cron/daily` (Vercel Cron) |
| `HTTPS_PROXY` | Proxy URL — required in this environment |
| `AUTOPILOT_ENABLED` | Master kill switch (default `true`) |
| `AUTOPILOT_DAILY_POST` | Enable daily post job (default `true`) |
| `AUTOPILOT_AUTO_REPLY` | Enable auto-reply (default `true`) |
| `AUTOPILOT_POST_DRY_RUN` | Generate but do not publish posts (default `false`) |
| `AUTOPILOT_REPLY_DRY_RUN` | Generate but do not publish replies (default `false`) |

`GBP_ACCOUNT_ID` / `GBP_LOCATION_ID` are stripped of prefixes at read time:
```js
const accountId = (process.env.GBP_ACCOUNT_ID || '').replace('accounts/', '');
const locationId = (process.env.GBP_LOCATION_ID || '').replace('locations/', '');
```
Preserve this pattern in any new function that reads these vars.

---

## Rate Limiting — Do Not Remove

`utils/gbpClient.js` enforces a 300 ms minimum delay between Google API calls
via the `throttle()` helper. All exported functions call `await throttle()`
before making their request. Any new function added to `gbpClient.js` must
also call `await throttle()` first.

---

## Error Handling Pattern

All functions in `gbpClient.js` use `extractGBPError(error, 'OPERATION_NAME')`
in their catch block. This returns a structured JSON object:
```js
{ success: false, error: 'ERROR_CODE', message: '...', googleStatus: '...', details: [...] }
```
Use this same pattern for any new GBP function. Never throw raw errors from
`gbpClient.js` — always return the error object so the route handler can
forward it as JSON.

---

## Policy Guard — Content Rules (summary)

`utils/policyGuard.js` blocks any post or reply that contains:
- Medical claims: "cure", "guarantee", "miracle", "diagnose", "prescription",
  "dosage", "#1", "best ent", "100%", etc.
- Foreign URLs (only the clinic's own website domain is allowed)
- Email addresses or phone numbers
- Hashtags (`#word`) or emojis
- The reviewer's own words quoted back at them

Length limits enforced:
- Posts: max 1,400 characters (GBP hard limit is 1,500; 100-char buffer)
- Replies: max 4,000 characters (GBP hard limit is 4,096; 96-char buffer)

Auto-reply only triggers for 4-star and 5-star reviews. 3-star and below are
always routed to a human — never auto-answered.

---

## Autopilot Flow — Do Not Break This Sequence

1. Cron hits `GET /api/cron/daily` (bearer auth with `CRON_SECRET`)
2. `handlers/cron/daily.js` calls `utils/autonomousAgent.js`
3. Orchestrator checks `alreadyPostedToday()` — if true, skips the post
4. Picks today's theme from `utils/contentStrategy.js`
5. Asks Gemini (`utils/geminiClient.js → generateText()`) to draft the post
6. Runs the draft through `utils/policyGuard.js` — up to 3 attempts
7. If all 3 attempts fail validation, logs rejection and stops (never publishes)
8. If validated, publishes via `gbpClient.createPost()`
9. Fetches unanswered 4★/5★ reviews, drafts replies, validates, publishes
10. All actions logged to `utils/auditLog.js`

---

## Code Style

- No comments unless the WHY is non-obvious.
- No multi-line comment blocks or docstrings.
- No emojis in code or log messages.
- Use `console.log` / `console.error` for logging (not a custom logger wrapper
  in new code — `logger.js` exists but is only used where already imported).
- ESM imports only (`import` / `export`) — this project uses `"type": "module"`.
  Never use `require()`.
- Keep functions small and flat. Avoid nested callbacks; use `async/await`.

---

## Git Rules

- Always commit and push to `main`.
- Never create or push to feature branches.
- Push command: `git push -u origin main`
- Never commit `.env` files or any file containing secrets.

---

## Last Worked On
- **Date:** 2026-04-27
<<<<<<< HEAD
- **Status:** Major feature implementation complete. App enhanced with AI Strategy, Drafts, Sentiment, and Reports. Full Audit upgrades (Job Locking, GCS Audit Log, Enhanced PolicyGuard) applied.
- **Completed:**
    - **Fixed:** Critical bugs (test suite ESM, React imports, icon rendering).
    - **Feature 1: AI Content Strategy Editor** (GCS persistence, Dynamic Themes, Knowledge Base).
    - **Feature 2: Post Scheduling & Drafts** (2026 spec, Drafts Queue, Approval flow).
    - **Feature 3: Patient Sentiment Dashboard** (AI summary of reviews).
    - **Feature 4: Monthly Pulse Report** (Multi-metric summary, Print-to-PDF).
    - **Full Audit Upgrades:** GCS Audit Log, Enhanced Quote Guard, Job Locking, and Draft Expiry.
- **Pending:**
    - Synchronize with remote repository (Conflict resolution in progress).
    - Final verification in production environment (Vercel).
=======
- **Status:** Major feature implementation complete. App enhanced with AI Strategy, Drafts, Sentiment, and Reports.
- **Completed:**
    - **Fixed:** Critical bugs (test suite ESM, React imports, icon rendering).
    - **Feature 1: AI Content Strategy Editor**
        - Created GCS Storage Utility for persistence.
        - Implemented dynamic weekly themes and Knowledge Base.
        - Added AI-suggested facts extraction from reviews.
    - **Feature 2: Post Scheduling & Drafts**
        - Updated `gbpClient.js` for 2026 recurring post standards.
        - Added Drafts Queue and approval workflow.
        - Updated Autopilot to generate drafts instead of posting directly.
    - **Feature 3: Patient Sentiment Dashboard**
        - Added AI sentiment analysis (praises/needs/summary) to Dashboard.
    - **Feature 4: Monthly Pulse Report**
        - Created multi-metric report generator with Gemini executive summary.
        - Added Reports view with print-to-PDF support.
- **Pending:**
    - Final verification in production environment (Vercel).
    - Push to GitHub once valid PAT is provided.

## Project Identity & Rules
- **Purpose:** GBP management for Eritage ENT Care (Entebbe, Uganda).
- **Core Principle:** Single-business operational backend; NOT a SaaS.
- **Primary Model:** gemini-2.5-pro (as per global preferences).
- **Key Constraints:**
    - Always commit/push directly to `main`.
    - All Google API calls must use `utils/gbpClient.js`.
    - Proxy required for outbound HTTP (handled in `gbpClient.js`).

## Environment State
- **Branch:** `main`
- **APIs:** My Business Reviews, Business Information, Performance (multi-metric), and Account Management enabled.
- **Auth:** Service Account preferred; OAuth2 fallback available.
>>>>>>> 2d121fe (feat: implement advanced AI strategy, drafts queue, sentiment dashboard, and monthly reports; plus production upgrades for autonomous agent)
