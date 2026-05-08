const Supervisor = require('./supervisor');
const logger = require('../common/logger');

async function startSynapse() {
  logger.info('Starting Synapse application...');
  const supervisor = new Supervisor();
  supervisor.start();

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received. Shutting down Synapse...');
    await supervisor.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received. Shutting down Synapse...');
    await supervisor.shutdown();
    process.exit(0);
  });
}

startSynapse().catch(error => {
  logger.error('Failed to start Synapse application:', error);
  process.exit(1);
});
