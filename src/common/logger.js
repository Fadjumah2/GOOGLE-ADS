const pino = require('pino');

// Basic pino logger. In a real production app, this would be configured
// to send logs to a centralized logging service (e.g., Stackdriver, Splunk, ELK).
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: {
    target: 'pino-pretty', // Using pino-pretty for development readability
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
    }
  }
});

module.exports = logger;
