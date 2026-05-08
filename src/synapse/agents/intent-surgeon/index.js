const { initDb, closeDb, getDb } = require('./db');

class IntentSurgeon {
  constructor() {
    this.dbInitialized = false;
  }

  async initialize() {
    if (!this.dbInitialized) {
      await initDb();
      this.dbInitialized = true;
      console.log('IntentSurgeon: Database initialized.');
    }
  }

  // Placeholder for interaction with Google Ads API Manager Service
  // This function would typically make an RPC/HTTP call to the Google Ads API Manager
  async fetchSearchTermReport(campaignId, operatingCustomerId) {
    console.log(`IntentSurgeon: Simulating fetching search term report for campaign ${campaignId} (Customer: ${operatingCustomerId})`);
    // Mock data for demonstration
    return [
      { searchTerm: 'cheap shoes online', clicks: 10, conversions: 0, cost: 5.0, campaignId: campaignId },
      { searchTerm: 'best running shoes', clicks: 20, conversions: 5, cost: 10.0, campaignId: campaignId },
      { searchTerm: 'free shoes download', clicks: 5, conversions: 0, cost: 1.0, campaignId: campaignId },
      { searchTerm: 'shoes repair near me', clicks: 3, conversions: 0, cost: 0.5, campaignId: campaignId },
      { searchTerm: 'luxury shoes brand', clicks: 15, conversions: 2, cost: 12.0, campaignId: campaignId },
    ];
  }

  async analyzeSearchTerms(campaignId, operatingCustomerId) {
    await this.initialize(); // Ensure DB is initialized
    console.log(`IntentSurgeon: Analyzing search terms for campaign ${campaignId}`);

    const searchTerms = await this.fetchSearchTermReport(campaignId, operatingCustomerId);
    const negativeKeywords = [];
    const db = getDb();

    // Simple analysis: identify search terms with 0 conversions and low clicks/high cost
    for (const term of searchTerms) {
      if (term.conversions === 0 && (term.clicks < 5 || term.cost > 2.0)) {
        console.log(`IntentSurgeon: Identified potential negative keyword: "${term.searchTerm}"`);
        negativeKeywords.push({
          keyword: term.searchTerm,
          campaign_id: campaignId,
          match_type: 'EXACT', // Prioritizing Exact Match as per requirement
        });

        // Store in SQLite
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT OR IGNORE INTO learned_negatives (keyword, campaign_id, match_type) VALUES (?, ?, ?)`,
            [term.searchTerm, campaignId, 'EXACT'],
            function (err) {
              if (err) {
                console.error(`IntentSurgeon: Error storing negative keyword "${term.searchTerm}":`, err.message);
                reject(err);
              } else if (this.changes > 0) {
                console.log(`IntentSurgeon: Stored new learned negative keyword: "${term.searchTerm}"`);
              }
              resolve();
            }
          );
        });
      }
    }
    return negativeKeywords;
  }

  // Placeholder for injecting negative keywords via Google Ads API Manager Service
  async injectNegativeKeywords(negativeKeywords, operatingCustomerId) {
    console.log(`IntentSurgeon: Simulating injecting ${negativeKeywords.length} negative keywords for Customer: ${operatingCustomerId}`);
    for (const nk of negativeKeywords) {
      console.log(`IntentSurgeon: Would inject "${nk.keyword}" (Match Type: ${nk.match_type}) into campaign ${nk.campaign_id} via Google Ads API Manager.`);
      // Here, in a real implementation, an RPC/HTTP call to the Google Ads API Manager service would be made
      // to create a NegativeKeywordCriterion for the specified campaign.
    }
    console.log('IntentSurgeon: Negative keyword injection simulation complete.');
  }

  async shutdown() {
    await closeDb();
    this.dbInitialized = false;
    console.log('IntentSurgeon: Shut down.');
  }
}

module.exports = IntentSurgeon;
