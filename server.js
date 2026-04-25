
import 'dotenv/config';
import path from 'path';
import express from 'express';
import { google } from 'googleapis';
import gbpClient from './utils/gbpClient.js';
import requireApiKey from './middleware/requireApiKey.js';
import handleReplyToReview from './handlers/gbp/replyToReview.js';
import handleDeleteReviewReply from './handlers/gbp/deleteReviewReply.js';
import handleGetReviews from './handlers/gbp/fetchReviews.js';
import handleGetPosts from './handlers/gbp/getPosts.js';
import handleGetProfile from './handlers/gbp/getProfile.js';
import handleUpdateProfile from './handlers/gbp/updateProfile.js';
import handleGetInsights from './handlers/gbp/getInsights.js';
import handleCreatePost from './handlers/gbp/createPost.js';
import handleFetchQuestions from './handlers/gbp/fetchQuestions.js';
import handleReplyToQuestion from './handlers/gbp/replyToQuestion.js';
import handleListMedia from './handlers/gbp/listMedia.js';
import handleUploadMedia from './handlers/gbp/uploadMedia.js';
import handleDeleteMedia from './handlers/gbp/deleteMedia.js';
import handleGetServiceList from './handlers/gbp/getServiceList.js';
import handleUpdateServiceList from './handlers/gbp/updateServiceList.js';
import handleAddService from './handlers/gbp/addService.js';
import handleGetSignedUrl from './handlers/gbp/getSignedUrl.js';
import handleDeletePost from './handlers/gbp/deletePost.js';
import handleGetLocations from './handlers/gbp/getLocations.js';
import handleGetVerificationStatus from './handlers/gbp/getVerificationStatus.js';
import handleGetAttributes from './handlers/gbp/getAttributes.js';
import handleAgentChat from './handlers/agent/chat.js';
import handleAutonomousPost from './handlers/agent/autonomousPost.js';
import handleAutoReplyReviews from './handlers/agent/autoReplyReviews.js';
import handleRunDaily from './handlers/agent/runDaily.js';
import handleAgentStatus from './handlers/agent/status.js';
import handleAuditLog from './handlers/agent/auditLog.js';
import handleCronDaily from './handlers/cron/daily.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Serve static assets from Vite's build output in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
} else {
  // Serve from public in development
  app.use(express.static(path.join(__dirname, 'public')));
}

// Public health-check — no auth needed
app.get("/ping", (req, res) => {
  res.json({ success: true, message: "pong" });
});

// Public compliance pages — no auth needed (required for Google API verification)
app.get("/privacy", (req, res) => {
  res.sendFile(path.join(__dirname, process.env.NODE_ENV === 'production' ? 'dist' : 'public', 'privacy.html'));
});
app.get("/terms", (req, res) => {
  res.sendFile(path.join(__dirname, process.env.NODE_ENV === 'production' ? 'dist' : 'public', 'terms.html'));
});

// Public marketing home page — no auth needed
app.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, process.env.NODE_ENV === 'production' ? 'dist' : 'public', 'home.html'));
});

// Dashboard redesign preview — no auth needed (mock data only)
app.get("/dashboard-new", (req, res) => {
  res.sendFile(path.join(__dirname, process.env.NODE_ENV === 'production' ? 'dist' : 'public', 'dashboard-new.html'));
});

// --- OAuth2 re-authorization routes (protected) ---
// Step 1: Visit /api/auth/login to get the Google consent URL
app.get('/api/auth/login', requireApiKey, (req, res) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',         // force consent screen so Google always returns a refresh token
    scope: ['https://www.googleapis.com/auth/business.manage']
  });
  res.json({ success: true, message: 'Open this URL in your browser to re-authorize', auth_url: url });
});

// Step 2: Google redirects here with ?code=... — exchange it for tokens and display the new refresh token
app.get('/api/auth/callback', requireApiKey, async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ success: false, error: 'Missing authorization code' });

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    const { tokens } = await oauth2Client.getToken(code);
    res.json({
      success: true,
      message: 'Copy the refresh_token below into your .env as GOOGLE_REFRESH_TOKEN',
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      expiry_date: tokens.expiry_date
    });
  } catch (error) {
    const detail = error.response ? error.response.data : error.message;
    res.status(500).json({ success: false, error: 'Token exchange failed', detail });
  }
});

app.get('/api/gbp/fetchReviews', requireApiKey, handleGetReviews);
app.post('/api/gbp/replyToReview', requireApiKey, handleReplyToReview);
app.delete('/api/gbp/deleteReviewReply', requireApiKey, handleDeleteReviewReply);
app.get('/api/gbp/getPosts', requireApiKey, handleGetPosts);
app.post('/api/gbp/createPost', requireApiKey, handleCreatePost);
app.post('/api/gbp/deletePost', requireApiKey, handleDeletePost);
app.get('/api/gbp/getProfile', requireApiKey, handleGetProfile);
app.patch('/api/gbp/updateProfile', requireApiKey, handleUpdateProfile);
app.get('/api/gbp/getInsights', requireApiKey, handleGetInsights);
app.get('/api/gbp/fetchQuestions', requireApiKey, handleFetchQuestions);
app.post('/api/gbp/replyToQuestion', requireApiKey, handleReplyToQuestion);
app.get('/api/gbp/listMedia', requireApiKey, handleListMedia);
app.post('/api/gbp/uploadMedia', requireApiKey, handleUploadMedia);
app.delete('/api/gbp/deleteMedia', requireApiKey, handleDeleteMedia);
app.get('/api/gbp/getServiceList', requireApiKey, handleGetServiceList);
app.patch('/api/gbp/updateServiceList', requireApiKey, handleUpdateServiceList);
app.post('/api/gbp/addService', requireApiKey, handleAddService);
app.post('/api/gbp/getSignedUrl', requireApiKey, handleGetSignedUrl);

app.get('/api/gbp/getVerificationStatus', requireApiKey, handleGetVerificationStatus);
app.get('/api/gbp/getAttributes', requireApiKey, handleGetAttributes);
app.get('/api/gbp/debug/locations', requireApiKey, handleGetLocations);

// AI Agent
app.post('/api/agent/chat', requireApiKey, handleAgentChat);

// --- Autonomous agent (Autopilot) ---
app.get('/api/agent/status', requireApiKey, handleAgentStatus);
app.get('/api/agent/auditLog', requireApiKey, handleAuditLog);
app.post('/api/agent/autonomousPost', requireApiKey, handleAutonomousPost);
app.post('/api/agent/autoReplyReviews', requireApiKey, handleAutoReplyReviews);
app.post('/api/agent/runDaily', requireApiKey, handleRunDaily);

// Vercel Cron entry point — authenticated via CRON_SECRET bearer token,
// NOT via x-api-key (Vercel Cron can't attach custom headers).
app.get('/api/cron/daily', handleCronDaily);

// Catch-all for SPA routing
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Only start the HTTP listener when this file is the entry point
// (i.e. local dev: `node server.js`). On Vercel the app is imported
// by `api/index.js` and run inside a serverless function, so we must
// not call app.listen there.
const isDirectEntry = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isDirectEntry) {
  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}

export default app;
