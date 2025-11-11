/**
 * CSV Parser Wrapper using PapaParse
 * CRITICAL: Uses header: false to include ALL rows (no skipping first row)
 */

const Papa = require('papaparse');
const logger = require('./logger');

function parseCSV(csvText) {
  try {
    // CRITICAL FIX: header: false ensures ALL rows are included
    // Setting header: true would skip the first row (WRONG!)
    const results = Papa.parse(csvText, {
      header: false,  // Critical! Don't skip first row
      dynamicTyping: true,
      skipEmptyLines: true
    });

    if (results.errors && results.errors.length > 0) {
      logger.warn('CSV parsing warnings:', results.errors);
    }

    logger.info(`Parsed CSV: ${results.data.length} rows`);
    return results.data;
  } catch (error) {
    logger.error('CSV parsing failed:', error);
    throw error;
  }
}

module.exports = {
  parseCSV
};
