/**
 * Web Scraping and API Service
 * Handles external data sourcing
 */

const fetch = require('node-fetch');
const logger = require('../utils/logger');

/**
 * Scrape data from a website using the browser page
 */
async function scrapeWebsite(page, selectors = {}) {
  try {
    await page.waitForLoadState('networkidle');
    
    // Extract various data types
    const result = {
      title: await page.title(),
      url: page.url(),
      text: '',
      tables: [],
      links: [],
      images: [],
      data: {}
    };
    
    // Get main text content
    result.text = await page.evaluate(() => {
      return document.body.innerText || document.body.textContent || '';
    });
    
    // Extract tables
    result.tables = await page.evaluate(() => {
      const tables = [];
      document.querySelectorAll('table').forEach(table => {
        const headers = [];
        const rows = [];
        
        table.querySelectorAll('th').forEach(th => headers.push(th.textContent.trim()));
        table.querySelectorAll('tr').forEach(tr => {
          const row = [];
          tr.querySelectorAll('td').forEach(td => row.push(td.textContent.trim()));
          if (row.length > 0) rows.push(row);
        });
        
        tables.push({ headers, rows });
      });
      return tables;
    });
    
    // Extract links
    result.links = await page.evaluate(() => {
      const links = [];
      document.querySelectorAll('a[href]').forEach(a => {
        links.push({
          text: a.textContent.trim(),
          href: a.href
        });
      });
      return links;
    });
    
    // Extract images
    result.images = await page.evaluate(() => {
      const images = [];
      document.querySelectorAll('img').forEach(img => {
        images.push({
          src: img.src,
          alt: img.alt
        });
      });
      return images;
    });
    
    // Extract custom selectors
    if (selectors) {
      for (const [key, selector] of Object.entries(selectors)) {
        try {
          result.data[key] = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            return el ? el.textContent.trim() : null;
          }, selector);
        } catch (e) {
          result.data[key] = null;
        }
      }
    }
    
    return result;
  } catch (error) {
    logger.error('Web scraping failed:', error);
    throw error;
  }
}

/**
 * Make an API request with custom headers
 */
async function callAPI(url, options = {}) {
  try {
    const {
      method = 'GET',
      headers = {},
      body = null,
      timeout = 30000
    } = options;
    
    logger.info(`API call: ${method} ${url}`);
    
    const fetchOptions = {
      method,
      headers: {
        'User-Agent': 'QuizSolver/1.0',
        'Accept': 'application/json',
        ...headers
      },
      timeout
    };
    
    if (body) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      if (!headers['Content-Type']) {
        fetchOptions.headers['Content-Type'] = 'application/json';
      }
    }
    
    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get('content-type') || '';
    
    let data;
    if (contentType.includes('json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    return {
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers),
      data
    };
  } catch (error) {
    logger.error('API call failed:', error);
    throw error;
  }
}

/**
 * Extract API endpoint from text
 */
function extractAPIEndpoint(text) {
  // Match various API URL patterns
  const patterns = [
    /(?:GET|POST|PUT|DELETE|PATCH)\s+(https?:\/\/[^\s"'<>]+)/gi,
    /(?:call|request|fetch|api)[^]*?(https?:\/\/[^\s"'<>]+)/gi,
    /https?:\/\/[^\s"'<>]*api[^\s"'<>]*/gi,
    /https?:\/\/[^\s"'<>]*\.json/gi
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Clean up the URL
      const url = match[0].replace(/^(GET|POST|PUT|DELETE|PATCH)\s+/i, '');
      return url;
    }
  }
  
  return null;
}

/**
 * Extract headers from instructions
 */
function extractAPIHeaders(text) {
  const headers = {};
  
  // Look for header patterns
  const headerPatterns = [
    /["']?([A-Za-z-]+)["']?\s*:\s*["']([^"']+)["']/g,
    /header[s]?[^:]*:\s*{([^}]+)}/gi,
    /Authorization[:\s]+([^\s"']+)/gi,
    /API[-_]?Key[:\s]+([^\s"']+)/gi,
    /Bearer\s+([^\s"']+)/gi
  ];
  
  // Find header: value patterns
  const headerMatch = text.match(/([A-Za-z-]+)\s*:\s*["']?([^"'\n]+)["']?/g);
  if (headerMatch) {
    headerMatch.forEach(h => {
      const [key, value] = h.split(':').map(s => s.trim().replace(/["']/g, ''));
      if (key && value && !['http', 'https'].includes(key.toLowerCase())) {
        headers[key] = value;
      }
    });
  }
  
  return headers;
}

/**
 * Execute a network request based on instructions
 */
async function executeAPIInstructions(instructions) {
  const url = extractAPIEndpoint(instructions);
  if (!url) {
    throw new Error('No API endpoint found in instructions');
  }
  
  const headers = extractAPIHeaders(instructions);
  const method = instructions.toLowerCase().includes('post') ? 'POST' : 'GET';
  
  logger.info(`Executing API: ${method} ${url}`);
  logger.info('Headers:', headers);
  
  return await callAPI(url, { method, headers });
}

module.exports = {
  scrapeWebsite,
  callAPI,
  extractAPIEndpoint,
  extractAPIHeaders,
  executeAPIInstructions
};
