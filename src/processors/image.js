/**
 * Image Question Processor
 * Handles image-based questions with base64 encoding
 */

const axios = require('axios');
const groq = require('../services/groq');
const logger = require('../utils/logger');

async function processImageQuestion(imageUrl, questionText) {
  try {
    logger.info('Processing image question:', imageUrl);

    // Download image and convert to base64
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    const base64Image = `data:image/jpeg;base64,${Buffer.from(response.data).toString('base64')}`;
    
    // Analyze image with Groq
    const answer = await groq.analyzeImage(base64Image, questionText);
    
    logger.info('Image analysis complete');
    return answer.trim();
  } catch (error) {
    logger.error('Image question processing failed:', error);
    throw error;
  }
}

async function extractImageFromPage(page) {
  try {
    // Get the first significant image from the page
    const imageUrl = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      for (let img of images) {
        // Skip small icons and look for content images
        if (img.width > 100 && img.height > 100) {
          return img.src;
        }
      }
      // Fallback to first image
      return images.length > 0 ? images[0].src : null;
    });

    return imageUrl;
  } catch (error) {
    logger.error('Failed to extract image from page:', error);
    return null;
  }
}

async function returnImageAsBase64(imageUrl) {
  try {
    logger.info('Converting image to base64:', imageUrl);

    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    const mimeType = response.headers['content-type'] || 'image/jpeg';
    const base64 = `data:${mimeType};base64,${Buffer.from(response.data).toString('base64')}`;
    
    logger.info('Image converted to base64');
    return base64;
  } catch (error) {
    logger.error('Image to base64 conversion failed:', error);
    throw error;
  }
}

module.exports = {
  processImageQuestion,
  extractImageFromPage,
  returnImageAsBase64
};
