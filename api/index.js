// Single Vercel serverless entry point.
//
// All server-side routing is handled by the Express app in `server.js`.
// Putting one function here (instead of one per file under `/api/...`)
// keeps us under Vercel's serverless function count cap and ensures the
// `requireApiKey` middleware is applied consistently to every request.
//
// `vercel.json` rewrites send all server-bound requests to `/api`, which
// resolves to this file.
import app from '../server.js';

export default app;
