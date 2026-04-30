# Front-End Bug Audit (April 30, 2026)

## Scope
- `index.html`
- `src/*.jsx`
- `public/marketing/app.jsx`

## Findings

### 1) **Build-blocking module path case mismatch**
- **Severity:** Critical
- **File:** `index.html`
- **Issue:** The entry script references `/src/app.jsx` (lowercase `a`), but the actual file is `src/App.jsx` (uppercase `A`).
- **Impact:** Production build fails in Vite/Rollup and the app cannot be bundled.
- **Evidence:** `npm run build` fails with `Rollup failed to resolve import "/src/app.jsx"`.
- **Recommendation:** Update `index.html` script import to `/src/App.jsx`.

### 2) **Unhandled non-JSON API error responses can mask root cause**
- **Severity:** Medium
- **File:** `src/data.jsx`
- **Issue:** `API.call` assumes JSON and silently falls back to `{}` for parse failures. For HTML/text error responses, the original server message is lost.
- **Impact:** Front-end users get generic errors like `HTTP 500` with little actionable detail; debugging is slower.
- **Recommendation:** On `!res.ok`, parse text fallback (or keep raw body snippet) when JSON parsing fails.

### 3) **Verbose auth/API console logging in production path**
- **Severity:** Low
- **Files:** `src/App.jsx`, `src/data.jsx`
- **Issue:** Authentication and API logging statements are always active.
- **Impact:** Noise in production console; can leak behavioral metadata (endpoints/status patterns) to any user with DevTools access.
- **Recommendation:** Gate logs behind a `DEV` flag (e.g., `import.meta.env.DEV`) or a debug setting.

## Validation commands run
- `npm run build` (failed due to Finding #1)
- `rg -n "src/app\.jsx|\[Auth\]|\[API\]" index.html src`

## Status
- This audit pass is **report-only**. No functional fix has been applied in this document.
