/**
 * Local Quiz Solver Test
 * Run the quiz solver locally to see actual results
 */

require('dotenv').config();
const { chromium } = require('playwright');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function solveQuiz(url) {
  console.log(`\n${'='.repeat(70)}`);
  console.log('🤖 LOCAL QUIZ SOLVER TEST');
  console.log(`${'='.repeat(70)}\n`);
  console.log(`Starting quiz at: ${url}\n`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    attempted: 0,
    submitted: 0,
    errors: 0,
    questions: []
  };

  try {
    let currentUrl = url;
    let questionNumber = 1;

    while (currentUrl && questionNumber <= 20) {
      console.log(`\n📝 Question ${questionNumber}`);
      console.log(`URL: ${currentUrl}`);
      
      await page.goto(currentUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000);

      // Extract question
      const questionText = await page.evaluate(() => {
        const questionDiv = document.querySelector('.question');
        return questionDiv ? questionDiv.textContent.trim() : '';
      });

      const title = await page.evaluate(() => {
        return document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : '';
      });

      console.log(`Title: ${title}`);
      console.log(`Question: ${questionText.substring(0, 100)}...`);

      results.attempted++;

      // Try to get LLM answer
      try {
        const prompt = `You are solving a quiz question. Provide a concise answer.

Question: ${questionText}

Instructions:
- For calculations, provide just the number
- For yes/no questions, answer yes or no
- For text questions, provide the exact text
- Be brief and direct

Answer:`;

        console.log('🧠 Asking LLM...');
        
        const completion = await groq.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          max_tokens: 500
        });

        const answer = completion.choices[0]?.message?.content || 'Unable to determine';
        console.log(`💡 LLM Answer: ${answer.substring(0, 150)}`);

        // Submit answer
        const textarea = await page.$('textarea[name="answer"]');
        if (textarea) {
          await textarea.fill(answer);
          await page.waitForTimeout(500);
          
          const submitButton = await page.$('button[type="submit"]');
          if (submitButton) {
            await submitButton.click();
            await page.waitForTimeout(2000);
            
            results.submitted++;
            console.log('✅ Answer submitted');

            // Check if there's a next question link
            const nextLink = await page.$('a[href^="/quiz/"]');
            if (nextLink) {
              const href = await nextLink.getAttribute('href');
              currentUrl = `http://localhost:3001${href}`;
              console.log(`➡️  Moving to next question`);
            } else {
              console.log('🏁 No more questions');
              break;
            }
          }
        }

        results.questions.push({
          number: questionNumber,
          title,
          question: questionText.substring(0, 100),
          answer: answer.substring(0, 100),
          submitted: true
        });

      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        results.errors++;
        results.questions.push({
          number: questionNumber,
          title,
          error: error.message,
          submitted: false
        });
        break;
      }

      questionNumber++;
    }

  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
  } finally {
    await browser.close();
  }

  // Print summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 FINAL RESULTS');
  console.log(`${'='.repeat(70)}\n`);
  console.log(`Questions Attempted: ${results.attempted}`);
  console.log(`Answers Submitted: ${results.submitted}`);
  console.log(`Errors: ${results.errors}`);
  console.log(`\nSuccess Rate: ${results.submitted}/${results.attempted} (${Math.round(results.submitted/results.attempted*100)}%)\n`);

  return results;
}

// Run test
const QUIZ_URL = 'http://localhost:3001/quiz/q1';
solveQuiz(QUIZ_URL).catch(console.error);
