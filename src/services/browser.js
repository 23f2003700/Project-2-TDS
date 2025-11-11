/**
 * Playwright Browser Manager
 * Handles headless browser initialization and cleanup
 */

const { chromium } = require('playwright');
const logger = require('../utils/logger');

let browser = null;
let context = null;

async function launchBrowser() {
  try {
    if (browser) {
      logger.debug('Browser already running, reusing instance');
      return browser;
    }

    const headless = process.env.HEADLESS !== 'false';
    logger.info(`Launching browser (headless: ${headless})`);

    browser = await chromium.launch({
      headless: headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    logger.info('Browser launched successfully');
    return browser;
  } catch (error) {
    logger.error('Failed to launch browser:', error);
    throw error;
  }
}

async function createPage() {
  try {
    if (!context) {
      await launchBrowser();
    }
    const page = await context.newPage();
    logger.debug('New page created');
    return page;
  } catch (error) {
    logger.error('Failed to create page:', error);
    throw error;
  }
}

async function closeBrowser() {
  try {
    if (browser) {
      await browser.close();
      browser = null;
      context = null;
      logger.info('Browser closed');
    }
  } catch (error) {
    logger.error('Error closing browser:', error);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});

module.exports = {
  launchBrowser,
  createPage,
  closeBrowser
};
