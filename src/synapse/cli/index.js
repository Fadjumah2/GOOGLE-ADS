#!/usr/bin/env node
// GOOGLE ADS APP/src/synapse/cli/index.js

const axios = require('axios');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const logger = require('../../../common/logger'); // Centralized logger

const SUPERVISOR_BASE_URL = process.env.SUPERVISOR_URL || 'http://localhost:3001';

async function sendCommand(method, endpoint, data = {}) {
  try {
    const response = await axios({
      method: method,
      url: `${SUPERVISOR_BASE_URL}${endpoint}`,
      data: data,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000 // 5 seconds timeout
    });
    logger.info('Supervisor Response:', response.data);
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      logger.error(`CLI: Connection to Supervisor at ${SUPERVISOR_BASE_URL} failed. Is the Supervisor running?`);
    } else {
      logger.error('CLI: Error communicating with Supervisor:', error.response ? error.response.data : error.message);
    }
    throw error;
  }
}

yargs(hideBin(process.argv))
  .command('status', 'Get the current status of the Synapse Supervisor and its agents', async () => {
    logger.info('CLI: Requesting status from Supervisor...');
    try {
      await sendCommand('get', '/status');
    } catch (error) {
      // Error already logged by sendCommand
    }
  })
  .command('optimize <campaignId>', 'Initiate an optimization workflow for a specific campaign', (yargs) => {
    yargs
      .positional('campaignId', {
        describe: 'The ID of the campaign to optimize',
        type: 'string'
      })
      .option('customer', {
        alias: 'c',
        describe: 'The Operating Customer ID for the Google Ads account',
        type: 'string',
        default: process.env.OPERATING_CUSTOMER_ID || '6022317886' // Default from user prompt
      });
  }, async (argv) => {
    logger.info(`CLI: Sending optimize-campaign command for Campaign ID: ${argv.campaignId}, Customer: ${argv.customer}`);
    try {
      await sendCommand('post', `/optimize-campaign/${argv.campaignId}`, { operatingCustomerId: argv.customer });
    } catch (error) {
      // Error already logged by sendCommand
    }
  })
  .demandCommand(1, 'You need at least one command before moving on')
  .help()
  .alias('h', 'help')
  .argv;
