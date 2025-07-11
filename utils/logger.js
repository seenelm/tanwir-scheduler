/**
 * Simple logger utility for the scheduler application
 */

// Define log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// Get the current log level from environment or default to INFO
const currentLogLevel = process.env.LOG_LEVEL
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()]
  : LOG_LEVELS.INFO;

/**
 * Format the log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} data - Optional data to log
 * @returns {string} - Formatted log message
 */
function formatLog(level, message, data) {
  const timestamp = new Date().toISOString();
  let logMessage = `${timestamp} [${level}] ${message}`;

  if (data) {
    if (typeof data === "object") {
      try {
        logMessage += ` ${JSON.stringify(data)}`;
      } catch (e) {
        logMessage += ` [Object cannot be stringified]`;
      }
    } else {
      logMessage += ` ${data}`;
    }
  }

  return logMessage;
}

/**
 * Log a message if the current log level allows it
 * @param {number} level - Numeric log level
 * @param {string} levelName - String log level name
 * @param {string} message - Log message
 * @param {Object} data - Optional data to log
 */
function log(level, levelName, message, data) {
  if (level <= currentLogLevel) {
    const formattedMessage = formatLog(levelName, message, data);

    switch (level) {
      case LOG_LEVELS.ERROR:
        console.error(formattedMessage);
        break;
      case LOG_LEVELS.WARN:
        console.warn(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }
  }
}

// Export the logger object with methods for each log level
export const logger = {
  error: (message, data) => log(LOG_LEVELS.ERROR, "ERROR", message, data),
  warn: (message, data) => log(LOG_LEVELS.WARN, "WARN", message, data),
  info: (message, data) => log(LOG_LEVELS.INFO, "INFO", message, data),
  debug: (message, data) => log(LOG_LEVELS.DEBUG, "DEBUG", message, data),
};
