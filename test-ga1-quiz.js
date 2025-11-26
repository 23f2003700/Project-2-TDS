/**
 * Test our quiz solver API against the GA1 Quiz Server
 */

const API_URL = 'http://tdsaaryanp2.us-east-1.elasticbeanstalk.com/quiz';
const QUIZ_URL = 'http://localhost:3001/quiz/q1';
const EMAIL = '23f2003700@ds.study.iitm.ac.in';
const SECRET = 'iitm-quiz-secret-23f2003700-2025';

async function testAPI() {
  console.log('\n=== Testing Quiz Solver API Against GA1 Questions ===\n');
  console.log(`API URL: ${API_URL}`);
  console.log(`Quiz URL: ${QUIZ_URL}`);
  console.log(`Email: ${EMAIL}\n`);

  try {
    const startTime = Date.now();
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: EMAIL,
        secret: SECRET,
        url: QUIZ_URL
      })
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`⏱️  Response time: ${duration.toFixed(2)}s\n`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('=== API Response ===');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n=== Analysis ===');
    console.log(`Status: ${data.status}`);
    console.log(`Message: ${data.message}`);
    if (data.url) {
      console.log(`Next URL: ${data.url}`);
    }
    
    console.log('\n📝 Note: The API has processed the quiz.');
    console.log('Check the quiz server logs to see what answers were submitted.');
    console.log('For questions requiring tool execution (VS Code, terminal commands),');
    console.log('the LLM will not be able to provide correct answers.');
    
  } catch (error) {
    console.error('\n❌ Error testing API:');
    console.error(error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
  }
}

// Run the test
testAPI();
