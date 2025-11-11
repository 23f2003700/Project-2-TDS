/**
 * Question Extractor
 * Extracts question content from rendered quiz pages
 */

const logger = require('../utils/logger');

async function extractQuestion(page) {
  try {
    logger.debug('Extracting question from page');

    // Wait for page to be fully loaded and JavaScript executed
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Additional wait for dynamic content

    // Extract all text content
    const textContent = await page.evaluate(() => {
      return document.body.innerText;
    });

    // Extract question-specific elements
    const questionData = await page.evaluate(() => {
      const data = {
        text: document.body.innerText,
        images: [],
        links: [],
        forms: []
      };

      // Extract images
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (img.src) {
          data.images.push(img.src);
        }
      });

      // Extract links (for CSV, PDF, API endpoints)
      const links = document.querySelectorAll('a');
      links.forEach(link => {
        if (link.href) {
          data.links.push({
            text: link.innerText,
            url: link.href
          });
        }
      });

      // Extract form submission URL
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        if (form.action) {
          data.forms.push(form.action);
        }
      });

      return data;
    });

    logger.info('Question extracted successfully');
    logger.debug('Images found:', questionData.images.length);
    logger.debug('Links found:', questionData.links.length);

    return questionData;
  } catch (error) {
    logger.error('Failed to extract question:', error);
    throw error;
  }
}

async function getSubmissionUrl(page) {
  try {
    // Look for submission URL in form action or data attributes
    const submissionUrl = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form && form.action) {
        return form.action;
      }
      
      // Look for data attributes
      const submitBtn = document.querySelector('[data-submit-url]');
      if (submitBtn) {
        return submitBtn.getAttribute('data-submit-url');
      }

      return null;
    });

    return submissionUrl;
  } catch (error) {
    logger.error('Failed to get submission URL:', error);
    return null;
  }
}

module.exports = {
  extractQuestion,
  getSubmissionUrl
};
