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

app.get('/dashboard/campaigns', async (req, res) => {
  try {
    // Replace with the actual customer ID you want to query
    // This is typically the account ID of the Google Ads account you want to manage
    const customerId = 'YOUR_CUSTOMER_ID'; // <--- IMPORTANT: User needs to provide this

    if (!customerId || customerId === 'YOUR_CUSTOMER_ID') {
      return res.status(400).send('Customer ID is required. Please update server.js with your Google Ads Customer ID.');
    }

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status
      FROM
        campaign
      ORDER BY
        campaign.id`;

    const campaigns = await googleAdsClient.query({
      customer_id: customerId,
      query: query,
    });

    res.json(campaigns);

  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).send('Error fetching campaigns.');
  }
});


app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
