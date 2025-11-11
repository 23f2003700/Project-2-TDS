/**
 * CSV Question Processor
 * CRITICAL: Uses header: false to include ALL rows
 */

const axios = require('axios');
const { parseCSV } = require('../utils/csv-parser');
const groq = require('../services/groq');
const logger = require('../utils/logger');

async function processCSVQuestion(csvUrl, questionText) {
  try {
    logger.info('Processing CSV question:', csvUrl);

    // Download CSV file
    const response = await axios.get(csvUrl, {
      timeout: 30000
    });

    const csvText = response.data;
    
    // Parse CSV with header: false (CRITICAL FIX)
    const csvData = parseCSV(csvText);
    
    logger.info(`CSV parsed: ${csvData.length} rows`);

    // Convert CSV to string representation for LLM
    const csvString = convertCSVToString(csvData);
    
    // Analyze with Groq
    const prompt = `Analyze this CSV data and answer the question. Be precise with numbers.

CSV Data (${csvData.length} rows):
${csvString}

Question: ${questionText}

Provide a direct answer (number, text, or true/false):`;

    const answer = await groq.analyzeText(prompt);
    
    // Parse answer
    let parsedAnswer = answer.trim();
    
    // Try to parse as boolean
    if (parsedAnswer.toLowerCase() === 'true') return true;
    if (parsedAnswer.toLowerCase() === 'false') return false;
    
    // Try to parse as number
    const numMatch = parsedAnswer.match(/-?\d+\.?\d*/);
    if (numMatch) {
      const num = parseFloat(numMatch[0]);
      if (!isNaN(num)) return num;
    }
    
    logger.info('CSV answer:', parsedAnswer);
    return parsedAnswer;
  } catch (error) {
    logger.error('CSV question processing failed:', error);
    throw error;
  }
}

function convertCSVToString(csvData, maxRows = 100) {
  try {
    // Take first and last rows for context if dataset is large
    if (csvData.length > maxRows) {
      const firstRows = csvData.slice(0, maxRows / 2);
      const lastRows = csvData.slice(-maxRows / 2);
      
      const firstStr = firstRows.map(row => row.join(',')).join('\n');
      const lastStr = lastRows.map(row => row.join(',')).join('\n');
      
      return `${firstStr}\n... (${csvData.length - maxRows} rows omitted) ...\n${lastStr}\n\nTotal rows: ${csvData.length}`;
    }

    return csvData.map(row => row.join(',')).join('\n');
  } catch (error) {
    logger.error('CSV to string conversion failed:', error);
    return '';
  }
}

async function extractCSVFromPage(page) {
  try {
    // Get CSV link from the page
    const csvUrl = await page.evaluate(() => {
      const links = document.querySelectorAll('a');
      for (let link of links) {
        const href = link.href.toLowerCase();
        if (href.endsWith('.csv')) {
          return link.href;
        }
      }
      return null;
    });

    return csvUrl;
  } catch (error) {
    logger.error('Failed to extract CSV from page:', error);
    return null;
  }
}

module.exports = {
  processCSVQuestion,
  extractCSVFromPage
};
