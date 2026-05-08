require('dotenv').config();
const express = require('express');
const { authenticate } = require('@google-cloud/local-auth');
const { OAuth2Client } = require('google-auth-library');
const { GoogleAdsApi } = require('google-ads-api');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const port = process.env.PORT || 3000;

// OAuth2 configuration
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// Google Ads API configuration
const DEVELOPER_TOKEN = process.env.DEVELOPER_TOKEN;
const LOGIN_CUSTOMER_ID = process.env.LOGIN_CUSTOMER_ID; // Your Manager Account ID (MCC) without hyphens

const oauth2Client = new OAuth2Client(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// If a refresh token is available, set it
if (REFRESH_TOKEN) {
  oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
}

// Google Ads API client
const googleAdsClient = new GoogleAdsApi({
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  developer_token: DEVELOPER_TOKEN,
  refresh_token: REFRESH_TOKEN,
  login_customer_id: LOGIN_CUSTOMER_ID,
});

app.use(express.static(path.join(__dirname, 'client')));

app.get('/', (req, res) => {
  res.send('Google Ads App Backend is running!');
});

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

    // Store the refresh token for future use
    console.log('Refresh Token:', tokens.refresh_token);
    res.send('Authentication successful! Refresh token logged to console. Please copy it and update your .env file.');

  } catch (error) {
    console.error('Error during authentication callback:', error);
    res.status(500).send('Authentication failed.');
  }
});

app.get('/revoke', async (req, res) => {
  try {
    await oauth2Client.revokeCredentials();
    res.send('Tokens revoked.');
  } catch (error) {
    console.error('Error revoking tokens:', error);
    res.status(500).send('Failed to revoke tokens.');
  }
});

app.use(express.json());
app.get('/dashboard/campaigns', async (req, res) => {
  try {
    // Replace with the actual customer ID you want to query
    // This is typically the account ID of the Google Ads account you want to manage
    const customerId = process.env.CUSTOMER_ID;

    if (!customerId || customerId === 'YOUR_CUSTOMER_ID') {
      return res.status(400).send('Customer ID is required. Please update server.js with your Google Ads Customer ID.');
    }

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.clicks,
        metrics.impressions,
        metrics.cost_micros
      FROM
        campaign
      ORDER BY
        campaign.id`;

    const customer = googleAdsClient.Customer({
      customer_id: customerId,
      refresh_token: REFRESH_TOKEN,
    });

    const campaigns = await customer.query(query);

    res.json(campaigns);

  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).send('Error fetching campaigns.');
  }
});

app.post('/dashboard/campaigns/:id/:action', async (req, res) => {
    const { id, action } = req.params;
    const customerId = process.env.CUSTOMER_ID;

    if (!customerId || customerId === 'YOUR_CUSTOMER_ID') {
      return res.status(400).json({ success: false, message: 'Customer ID is required.' });
    }

    const customer = googleAdsClient.Customer({
        customer_id: customerId,
        refresh_token: REFRESH_TOKEN,
    });

    const newStatus = action === 'pause' ? 'PAUSED' : 'ENABLED';

    try {
        await customer.campaigns.update({
            resource_name: `customers/${customerId}/campaigns/${id}`,
            status: newStatus,
        });
        res.json({ success: true });
    } catch (error) {
        console.error(`Error updating campaign ${id}:`, error);
        res.status(500).json({ success: false, message: 'Error updating campaign.' });
    }
});

app.get('/dashboard/campaigns/:id/ad-groups', async (req, res) => {
    const { id } = req.params;
    const customerId = process.env.CUSTOMER_ID;

    if (!customerId || customerId === 'YOUR_CUSTOMER_ID') {
      return res.status(400).send('Customer ID is required.');
    }

    const query = `
        SELECT
            ad_group.id,
            ad_group.name,
            ad_group.status,
            metrics.clicks,
            metrics.impressions,
            metrics.cost_micros
        FROM
            ad_group
        WHERE
            campaign.id = ${id}`;

    const customer = googleAdsClient.Customer({
      customer_id: customerId,
      refresh_token: REFRESH_TOKEN,
    });

    try {
        const adGroups = await customer.query(query);
        res.json(adGroups);
    } catch (error) {
        console.error(`Error fetching ad groups for campaign ${id}:`, error);
        res.status(500).send('Error fetching ad groups.');
    }
});

app.get('/dashboard/ad-groups/:id/ads', async (req, res) => {
    const { id } = req.params; // id is ad_group_id
    const customerId = process.env.CUSTOMER_ID;

    if (!customerId || customerId === 'YOUR_CUSTOMER_ID') {
      return res.status(400).send('Customer ID is required.');
    }

    const query = `
        SELECT
            ad_group_ad.ad.id,
            ad_group_ad.ad.name,
            ad_group_ad.status,
            ad_group_ad.ad.type,
            metrics.clicks,
            metrics.impressions,
            metrics.cost_micros
        FROM
            ad_group_ad
        WHERE
            ad_group.id = ${id}`;

    const customer = googleAdsClient.Customer({
      customer_id: customerId,
      refresh_token: REFRESH_TOKEN,
    });

    try {
        const ads = await customer.query(query);
        res.json(ads);
    } catch (error) {
        console.error(`Error fetching ads for ad group ${id}:`, error);
        res.status(500).send('Error fetching ads.');
    }
});

app.get('/dashboard/reports/campaigns', async (req, res) => {
    const customerId = process.env.CUSTOMER_ID;

    if (!customerId || customerId === 'YOUR_CUSTOMER_ID') {
      return res.status(400).send('Customer ID is required.');
    }

    // For a simple report, let's fetch daily campaign performance for the last 7 days
    const query = `
        SELECT
            segments.date,
            campaign.id,
            campaign.name,
            metrics.clicks,
            metrics.impressions,
            metrics.cost_micros
        FROM
            campaign
        WHERE
            segments.date DURING LAST_7_DAYS
        ORDER BY
            segments.date, campaign.id`;

    const customer = googleAdsClient.Customer({
      customer_id: customerId,
      refresh_token: REFRESH_TOKEN,
    });

    try {
        const report = await customer.query(query);
        res.json(report);
    } catch (error) {
        console.error('Error fetching campaign report:', error);
        res.status(500).send('Error fetching campaign report.');
    }
});


app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
