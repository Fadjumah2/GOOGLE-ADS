const pino = require('pino');

// Basic pino logger. In a real production app, this would be configured
// to send logs to a centralized logging service (e.g., Stackdriver, Splunk, ELK).
const transport = pino.transport({
  targets: [
    {
      target: 'pino-pretty', // Logs to console (stdout)
      options: {
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
      },
      level: process.env.LOG_LEVEL || 'info'
    }
  ]
});

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
}, transport);

module.exports = logger;
