/**
 * Form Submission Handler
 * Submits answers to quiz endpoints and handles responses
 */

const axios = require('axios');
const logger = require('../utils/logger');

async function submitAnswer(submissionUrl, answer, email, secret) {
  try {
    logger.info(`Submitting answer to: ${submissionUrl}`);
    logger.debug('Answer:', answer);

    const response = await axios.post(submissionUrl, {
      email: email,
      secret: secret,
      answer: answer
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    logger.info('Submission response:', response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      logger.error('Submission failed with status:', error.response.status);
      logger.error('Response data:', error.response.data);
      return error.response.data;
    } else {
      logger.error('Submission request failed:', error.message);
      throw error;
    }
  }
}

function parseSubmissionResponse(response) {
  try {
    // Expected response format: { correct: true/false, url: "next-url" }
    const isCorrect = response.correct === true;
    const nextUrl = response.url || null;
    
    logger.info(`Answer correct: ${isCorrect}, Next URL: ${nextUrl || 'none'}`);
    
    return {
      isCorrect,
      nextUrl,
      message: response.message || ''
    };
  } catch (error) {
    logger.error('Failed to parse submission response:', error);
    return {
      isCorrect: false,
      nextUrl: null,
      message: 'Failed to parse response'
    };
  }
}

module.exports = {
  submitAnswer,
  parseSubmissionResponse
};
