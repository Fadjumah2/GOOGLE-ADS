require('dotenv').config();
const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const { GoogleAdsApi } = require('google-ads-api');
const path = require('path');
const fs = require('fs').promises;
const db = require('./src/common/db');
const logger = require('./src/common/logger'); // Import the logger
const initializeDatabase = require('./src/common/init_db'); // Import init_db

const app = express();
const port = process.env.PORT || 3000;

// OAuth2 configuration
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// Google Ads API configuration
const DEVELOPER_TOKEN = process.env.DEVELOPER_TOKEN;
const LOGIN_CUSTOMER_ID = process.env.LOGIN_CUSTOMER_ID;

const oauth2Client = new OAuth2Client(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

if (REFRESH_TOKEN) {
  oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
}

const googleAdsClient = new GoogleAdsApi({
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  developer_token: DEVELOPER_TOKEN,
  refresh_token: REFRESH_TOKEN,
  login_customer_id: LOGIN_CUSTOMER_ID,
});

app.use(express.static(path.join(__dirname, 'client')));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Auth Routes
app.get('/auth/google', async (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/adwords',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];
  const authorizeUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
  res.redirect(authorizeUrl);
});

app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    console.log('Refresh Token:', tokens.refresh_token);
    res.send('Authentication successful! Refresh token logged to console.');
  } catch (error) {
    logger.error('Authentication failed:', error);
    res.status(500).json({ error: 'Authentication failed.' });
  }});

// Google Ads Data Endpoints
app.get('/dashboard/campaigns', async (req, res) => {
  try {
    const customerId = process.env.CUSTOMER_ID;
    if (!customerId) return res.status(400).send('Customer ID missing.');

    const query = `
      SELECT campaign.id, campaign.name, campaign.status, 
             metrics.clicks, metrics.impressions, metrics.cost_micros
      FROM campaign ORDER BY campaign.id`;

    const customer = googleAdsClient.Customer({ customer_id: customerId, refresh_token: REFRESH_TOKEN });
    const campaigns = await customer.query(query);
    res.json(campaigns);
  } catch (error) {
    res.status(500).send('Error fetching campaigns.');
  }
});

app.post('/dashboard/campaigns/:id/:action', async (req, res) => {
    const { id, action } = req.params;
    const customerId = process.env.CUSTOMER_ID;
    const customer = googleAdsClient.Customer({ customer_id: customerId, refresh_token: REFRESH_TOKEN });
    const newStatus = action === 'pause' ? 'PAUSED' : 'ENABLED';

    try {
        await customer.campaigns.update([{
            resource_name: `customers/${customerId}/campaigns/${id}`,
            status: newStatus,
        }]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.get('/dashboard/reports/campaigns', async (req, res) => {
    try {
        const customerId = process.env.CUSTOMER_ID;
        const query = `
            SELECT segments.date, campaign.name, metrics.clicks, metrics.impressions, metrics.cost_micros
            FROM campaign WHERE segments.date DURING LAST_7_DAYS
            ORDER BY segments.date DESC`;
        const customer = googleAdsClient.Customer({ customer_id: customerId, refresh_token: REFRESH_TOKEN });
        const report = await customer.query(query);
        res.json(report);
    } catch (error) {
        res.status(500).send('Error fetching report.');
    }
});

// Synapse Integration Endpoints
app.get('/dashboard/agent-runs', async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT ar.*, cc.config_name 
            FROM agent_runs ar
            LEFT JOIN campaign_configurations cc ON ar.campaign_config_id = cc.id
            ORDER BY ar.run_timestamp DESC LIMIT 50`);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching runs.' });
    }
});

app.get('/dashboard/agent-configurations', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM campaign_configurations ORDER BY id');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching configs.' });
    }
});

app.get('/dashboard/system-logs', async (req, res) => {
    res.json({ message: 'File-based logging is disabled in this environment.' });
});

app.get('/dashboard/prepared-actions', async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT 'IntentSurgeon' as agent, search_term as action_description, campaign_id, status
            FROM intent_surgeon_logs
            WHERE status = 'identified'
            ORDER BY injected_at DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching prepared actions.' });
    }
});

app.get('/dashboard/mode', async (req, res) => {
    try {
        const { rows } = await db.query("SELECT value FROM system_settings WHERE key = 'operational_mode'");
        res.json({ mode: rows[0].value });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching mode.' });
    }
});

app.post('/dashboard/mode', async (req, res) => {
    const { mode } = req.body;
    try {
        await db.query("UPDATE system_settings SET value = $1 WHERE key = 'operational_mode'", [mode]);
        res.json({ success: true, mode });
    } catch (error) {
        res.status(500).json({ error: 'Error updating mode.' });
    }
});

app.post('/dashboard/chat', async (req, res) => {
    const { message } = req.body;
    logger.info(`Chat command received: ${message}`);
    // Simplified logic: Just log the command for now. 
    // Real implementation would parse the command and call googleAdsClient.
    res.json({ response: `Command received: "${message}". Functionality pending further integration.` });
});

app.get('/dashboard/status', async (req, res) => {
    const status = { googleAds: 'Connected', database: 'Connected', synapse: 'Active' };
    try { await db.query('SELECT 1'); } catch (e) { status.database = 'Error'; }
    res.json(status);
});

const { spawn } = require('child_process');

app.post('/dashboard/trigger-agent/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Run AgentOrchestrator in a background process to avoid blocking the server
        const child = spawn('node', ['src/synapse/agent-orchestrator.js', id], {
            detached: true,
            stdio: 'ignore'
        });
        child.unref();
        res.json({ success: true, message: `Agent run triggered for config ID ${id}` });
    } catch (error) {
        logger.error('Error triggering agent:', error);
        res.status(500).json({ success: false, message: 'Failed to trigger agent.' });
    }
});

// Initialize database once globally
let dbInitialized = false;

// Middleware to ensure DB is initialized before handling requests
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    try {
      await initializeDatabase();
      dbInitialized = true;
      logger.info('Database initialized successfully.');
    } catch (err) {
      logger.error('Failed to initialize database:', err);
      return res.status(500).json({ error: 'Database initialization failed.' });
    }
  }
  next();
});

module.exports = app;
