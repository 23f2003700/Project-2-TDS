/**
 * Main Quiz Solver Orchestrator
 * Handles quiz flow with retry logic and multiple question types
 */

const browser = require('./services/browser');
const { extractQuestion, getSubmissionUrl } = require('./processors/question');
const { processTextQuestion, processPDFQuestion } = require('./processors/text');
const { processImageQuestion, extractImageFromPage, returnImageAsBase64 } = require('./processors/image');
const { processAudioQuestion, extractAudioFromPage } = require('./processors/audio');
const { processCSVQuestion, extractCSVFromPage } = require('./processors/csv');
const { submitAnswer, parseSubmissionResponse } = require('./services/submission');
const logger = require('./utils/logger');

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const MAX_QUIZ_CHAIN = 20; // Maximum number of quiz URLs to follow

async function solveQuiz(initialUrl, email, secret) {
  const startTime = Date.now();
  let currentUrl = initialUrl;
  let quizCount = 0;
  const results = [];

  try {
    logger.info('Starting quiz solver');
    logger.info('Initial URL:', initialUrl);

    while (currentUrl && quizCount < MAX_QUIZ_CHAIN) {
      quizCount++;
      logger.info(`\n=== Quiz ${quizCount} ===`);
      logger.info('URL:', currentUrl);

      const result = await solveQuizPage(currentUrl, email, secret);
      results.push(result);

      if (result.success && result.nextUrl) {
        currentUrl = result.nextUrl;
        logger.info('Moving to next quiz');
      } else {
        logger.info('Quiz chain complete');
        break;
      }

      // Check time limit (3 minutes = 180 seconds)
      const elapsedTime = (Date.now() - startTime) / 1000;
      if (elapsedTime > 180) {
        logger.warn('Time limit approaching (3 minutes), stopping');
        break;
      }
    }

    const totalTime = (Date.now() - startTime) / 1000;
    logger.info(`\nCompleted ${quizCount} quizzes in ${totalTime.toFixed(2)} seconds`);

    return {
      success: true,
      quizCount,
      totalTime,
      results
    };
  } catch (error) {
    logger.error('Quiz solver failed:', error);
    throw error;
  }
}

async function solveQuizPage(url, email, secret) {
  let page = null;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      // Create new page
      page = await browser.createPage();

      // Navigate to quiz
      logger.info('Navigating to quiz page...');
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

      // Extract question
      const questionData = await extractQuestion(page);
      logger.info('Question text preview:', questionData.text.substring(0, 200));

      // Get submission URL
      let submissionUrl = await getSubmissionUrl(page);
      
      // If no form submission URL, look in links or use default pattern
      if (!submissionUrl) {
        // Try to find submission endpoint in page content
        const possibleEndpoint = questionData.text.match(/POST\s+to\s+(https?:\/\/[^\s]+)/i);
        if (possibleEndpoint) {
          submissionUrl = possibleEndpoint[1];
        } else {
          // Default submission URL pattern
          submissionUrl = url.replace(/\/quiz.*/, '/submit');
        }
      }

      logger.info('Submission URL:', submissionUrl);

      // Determine question type and process
      const answer = await processQuestion(page, questionData);
      logger.info('Generated answer:', answer);

      // Submit answer
      const response = await submitAnswer(submissionUrl, answer, email, secret);
      const parsed = parseSubmissionResponse(response);

      if (parsed.isCorrect) {
        logger.info('✓ Answer correct!');
        await page.close();
        return {
          success: true,
          url,
          answer,
          nextUrl: parsed.nextUrl,
          attempts: retries + 1
        };
      } else {
        logger.warn(`✗ Answer incorrect (attempt ${retries + 1}/${MAX_RETRIES})`);
        retries++;
        
        if (retries < MAX_RETRIES) {
          logger.info(`Retrying in ${RETRY_DELAY / 1000} seconds...`);
          await page.close();
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    } catch (error) {
      logger.error(`Attempt ${retries + 1} failed:`, error.message);
      retries++;
      
      if (page) {
        await page.close();
      }
      
      if (retries < MAX_RETRIES) {
        logger.info(`Retrying in ${RETRY_DELAY / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  // All retries exhausted
  return {
    success: false,
    url,
    error: 'Max retries exceeded',
    attempts: retries
  };
}

async function processQuestion(page, questionData) {
  try {
    // Check for CSV
    const csvUrl = await extractCSVFromPage(page);
    if (csvUrl) {
      logger.info('Detected CSV question');
      return await processCSVQuestion(csvUrl, questionData.text);
    }

    // Check for audio
    const audioUrl = await extractAudioFromPage(page);
    if (audioUrl) {
      logger.info('Detected audio question');
      return await processAudioQuestion(audioUrl, questionData.text);
    }

    // Check for images
    const imageUrl = await extractImageFromPage(page);
    if (imageUrl) {
      logger.info('Detected image question');
      
      // Check if question asks for base64
      if (questionData.text.toLowerCase().includes('base64') || 
          questionData.text.toLowerCase().includes('data uri')) {
        return await returnImageAsBase64(imageUrl);
      } else {
        return await processImageQuestion(imageUrl, questionData.text);
      }
    }

    // Check for PDF links
    const pdfLink = questionData.links.find(link => 
      link.url.toLowerCase().endsWith('.pdf')
    );
    if (pdfLink) {
      logger.info('Detected PDF question');
      return await processPDFQuestion(pdfLink.url, questionData.text);
    }

    // Default to text question
    logger.info('Processing as text question');
    return await processTextQuestion(questionData.text);
  } catch (error) {
    logger.error('Question processing failed:', error);
    throw error;
  }
}

module.exports = {
  solveQuiz
};
