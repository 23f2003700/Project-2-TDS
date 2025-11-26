/**
 * Local Quiz Tester
 * Tests the quiz solver locally to see detailed results
 */

require('dotenv').config();
const { solveQuiz } = require('./src/quiz-solver');
const { launchBrowser, closeBrowser } = require('./src/services/browser');
const logger = require('./src/utils/logger');

const QUIZ_URL = 'https://exam.sanand.workers.dev/tds-2025-09-ga1';
const EMAIL = process.env.STUDENT_EMAIL || '23f2003700@ds.study.iitm.ac.in';
const SECRET = process.env.STUDENT_SECRET || 'iitm-quiz-secret-23f2003700-2025';

async function testQuiz() {
  console.log('\n=================================');
  console.log('🧪 Testing Quiz Solver');
  console.log('=================================\n');
  console.log(`Quiz URL: ${QUIZ_URL}`);
  console.log(`Email: ${EMAIL}`);
  console.log(`Secret: ${SECRET.substring(0, 10)}...`);
  console.log('\n=================================\n');

  const startTime = Date.now();

  try {
    // Launch browser
    console.log('🌐 Launching browser...');
    await launchBrowser();
    console.log('✅ Browser launched\n');

    // Solve quiz
    console.log('🤖 Starting quiz solver...\n');
    const result = await solveQuiz(QUIZ_URL, EMAIL, SECRET);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n=================================');
    console.log('✅ QUIZ COMPLETED');
    console.log('=================================\n');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log(`\n⏱️  Total Time: ${duration} seconds`);
    console.log('\n=================================\n');

  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n=================================');
    console.log('❌ QUIZ FAILED');
    console.log('=================================\n');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
    console.log(`\n⏱️  Time Before Failure: ${duration} seconds`);
    console.log('\n=================================\n');
  } finally {
    // Close browser
    console.log('🔒 Closing browser...');
    await closeBrowser();
    console.log('✅ Browser closed\n');
    process.exit(0);
  }
}

// Run test
testQuiz();
