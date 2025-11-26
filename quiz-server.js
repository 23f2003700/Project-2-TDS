/**
 * GA1 Quiz Server
 * Hosts the 20 GA1 questions in a format compatible with our quiz solver API
 */

const express = require('express');
const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Quiz data - GA1 questions in sequential chain format
const quizzes = {
  'q1': {
    id: 'q1',
    title: 'VS Code Version',
    question: 'What is the output of code -s command in Visual Studio Code terminal?',
    hint: 'Run: code -s in your terminal',
    nextQuiz: 'q2'
  },
  'q2': {
    id: 'q2',
    title: 'GitHub Copilot Extension',
    question: 'List all VS Code extensions installed. Paste your VS Code extension IDs (one per line) from code --list-extensions',
    hint: 'Run: code --list-extensions',
    nextQuiz: 'q3'
  },
  'q3': {
    id: 'q3',
    title: 'POST HTTP requests with uv',
    question: 'POST a JSON payload to https://httpbin.org/post with email=23f2003700@ds.study.iitm.ac.in and request_id=3174ffbc. Paste the full response.',
    hint: 'Run: uv run --with httpie -- http --json POST https://httpbin.org/post email=23f2003700@ds.study.iitm.ac.in request_id=3174ffbc',
    nextQuiz: 'q4'
  },
  'q4': {
    id: 'q4',
    title: 'Run command with npx',
    question: 'What is the SHA256 hash output of running npx -y prettier@3.4.2 README.md | sha256sum?',
    hint: 'Download README.md file and run the command',
    nextQuiz: 'q5'
  },
  'q5': {
    id: 'q5',
    title: 'Use Google Sheets',
    question: 'What is the result of this formula in Google Sheets: =SUM(ARRAY_CONSTRAIN(SEQUENCE(100, 100, 9, 9), 1, 10))',
    hint: 'Type the formula in Google Sheets and get the result',
    expectedAnswer: '945',
    nextQuiz: 'q6'
  },
  'q6': {
    id: 'q6',
    title: 'Use Excel',
    question: 'What is the result of this formula in Excel (Office 365 only): =SUM(TAKE(SORTBY({6,8,1,4,6,4,0,10,11,7,8,9,0,2,14,2}, {10,9,13,2,11,8,16,14,7,15,5,4,6,1,3,12}), 1, 11))',
    hint: 'Type the formula in Excel Office 365',
    nextQuiz: 'q7'
  },
  'q7': {
    id: 'q7',
    title: 'Use DevTools',
    question: 'What is the value in the hidden input field above question 8 in the GA1 exam?',
    hint: 'Inspect the page with Chrome DevTools',
    nextQuiz: 'q8'
  },
  'q8': {
    id: 'q8',
    title: 'Count Weekend Days',
    question: 'How many weekend days (Saturdays and Sundays) are between 1988-09-09 and 2008-02-03 (inclusive)?',
    hint: 'Count both endpoints. Weekends = Saturdays + Sundays',
    expectedAnswer: '2038',
    nextQuiz: 'q9'
  },
  'q9': {
    id: 'q9',
    title: 'Extract JSON from a ZIP',
    question: 'Download the ZIP file, extract sales.json, and provide the value of total_sales for APAC region in April 2025.',
    hint: 'Extract and read sales.json from the provided ZIP file',
    nextQuiz: 'q10'
  },
  'q10': {
    id: 'q10',
    title: 'Sort and Filter JSON Product Catalog',
    question: 'Given a JSON array of 100 products, filter out items with price < 89.40, then sort by category (A→Z), price (highest→lowest), name (A→Z). Return minified JSON.',
    hint: 'Filter, then multi-key sort, then minify',
    products: [
      {"category":"Apparel","price":46.58,"name":"Super Device"},
      {"category":"Books","price":196.63,"name":"Deluxe Set"},
      {"category":"Apparel","price":94.81,"name":"Ultra Device"},
      {"category":"Electronics","price":193.02,"name":"Eco Set"},
      {"category":"Electronics","price":66.79,"name":"Super Gadget"},
      {"category":"Home","price":115.81,"name":"Deluxe Device"},
      {"category":"Home","price":22.83,"name":"Smart Widget"},
      {"category":"Electronics","price":178.9,"name":"Eco Kit"},
      {"category":"Apparel","price":190.32,"name":"Super Tool"},
      {"category":"Toys","price":119.78,"name":"Pro Tool"},
      {"category":"Apparel","price":39.25,"name":"Pro Device"},
      {"category":"Toys","price":192.86,"name":"Mini Set"},
      {"category":"Electronics","price":168.17,"name":"Mini Tool"},
      {"category":"Home","price":67.77,"name":"Pro Widget"},
      {"category":"Toys","price":75.1,"name":"Smart Kit"},
      {"category":"Electronics","price":34.47,"name":"Ultra Item"},
      {"category":"Home","price":151.22,"name":"Deluxe Device"},
      {"category":"Toys","price":199.53,"name":"Deluxe Device"},
      {"category":"Toys","price":148.97,"name":"Mini Tool"},
      {"category":"Apparel","price":60.13,"name":"Ultra Gadget"},
      {"category":"Home","price":41.56,"name":"Mini Widget"},
      {"category":"Apparel","price":163.44,"name":"Smart Item"},
      {"category":"Toys","price":138.15,"name":"Deluxe Set"},
      {"category":"Books","price":52.76,"name":"Mini Device"},
      {"category":"Home","price":75.43,"name":"Mini Gadget"},
      {"category":"Toys","price":122.68,"name":"Ultra Tool"},
      {"category":"Books","price":26.12,"name":"Mini Set"},
      {"category":"Home","price":140.93,"name":"Deluxe Gadget"},
      {"category":"Home","price":29.92,"name":"Deluxe Widget"},
      {"category":"Toys","price":31.85,"name":"Super Set"},
      {"category":"Home","price":46.63,"name":"Smart Gadget"},
      {"category":"Electronics","price":23.17,"name":"Mini Kit"},
      {"category":"Toys","price":96.69,"name":"Ultra Gadget"},
      {"category":"Toys","price":153.44,"name":"Eco Widget"},
      {"category":"Apparel","price":95.68,"name":"Ultra Widget"},
      {"category":"Electronics","price":69.48,"name":"Pro Kit"},
      {"category":"Toys","price":194.78,"name":"Deluxe Item"},
      {"category":"Electronics","price":50.08,"name":"Deluxe Item"},
      {"category":"Toys","price":81.44,"name":"Pro Widget"},
      {"category":"Electronics","price":139.93,"name":"Deluxe Gadget"},
      {"category":"Apparel","price":27.71,"name":"Super Widget"},
      {"category":"Electronics","price":75.13,"name":"Mini Gadget"},
      {"category":"Apparel","price":187.38,"name":"Super Tool"},
      {"category":"Toys","price":24.5,"name":"Deluxe Set"},
      {"category":"Home","price":155.28,"name":"Smart Set"},
      {"category":"Books","price":28.9,"name":"Eco Kit"},
      {"category":"Home","price":46.56,"name":"Deluxe Item"},
      {"category":"Books","price":118.81,"name":"Mini Set"},
      {"category":"Apparel","price":67.4,"name":"Eco Tool"},
      {"category":"Electronics","price":37.1,"name":"Ultra Device"},
      {"category":"Electronics","price":178.47,"name":"Eco Item"},
      {"category":"Toys","price":31.36,"name":"Deluxe Tool"},
      {"category":"Apparel","price":55.22,"name":"Deluxe Device"},
      {"category":"Books","price":62.58,"name":"Mini Tool"},
      {"category":"Home","price":50.58,"name":"Deluxe Set"},
      {"category":"Home","price":30.91,"name":"Eco Gadget"},
      {"category":"Books","price":184.37,"name":"Pro Kit"},
      {"category":"Toys","price":91.25,"name":"Ultra Device"},
      {"category":"Home","price":143.76,"name":"Deluxe Device"},
      {"category":"Home","price":38.11,"name":"Super Device"},
      {"category":"Electronics","price":62.76,"name":"Deluxe Kit"},
      {"category":"Toys","price":22.91,"name":"Smart Kit"},
      {"category":"Toys","price":192.72,"name":"Mini Set"},
      {"category":"Electronics","price":121.4,"name":"Smart Device"},
      {"category":"Home","price":99.01,"name":"Eco Gadget"},
      {"category":"Toys","price":190.21,"name":"Ultra Kit"},
      {"category":"Home","price":24.77,"name":"Ultra Gadget"},
      {"category":"Books","price":51.98,"name":"Deluxe Item"},
      {"category":"Books","price":163.08,"name":"Ultra Widget"},
      {"category":"Home","price":120.7,"name":"Mini Widget"},
      {"category":"Home","price":175.99,"name":"Deluxe Tool"},
      {"category":"Apparel","price":192.27,"name":"Eco Item"},
      {"category":"Toys","price":172.48,"name":"Ultra Set"},
      {"category":"Books","price":40.85,"name":"Deluxe Widget"},
      {"category":"Toys","price":101.57,"name":"Smart Widget"},
      {"category":"Toys","price":131.02,"name":"Ultra Tool"},
      {"category":"Home","price":162.34,"name":"Deluxe Device"},
      {"category":"Apparel","price":117.21,"name":"Super Item"},
      {"category":"Home","price":20.69,"name":"Smart Device"},
      {"category":"Home","price":163.64,"name":"Deluxe Set"},
      {"category":"Electronics","price":90,"name":"Smart Device"},
      {"category":"Toys","price":140.35,"name":"Eco Kit"},
      {"category":"Apparel","price":70.85,"name":"Smart Widget"},
      {"category":"Toys","price":153.34,"name":"Super Gadget"},
      {"category":"Home","price":164.55,"name":"Super Set"},
      {"category":"Home","price":138.28,"name":"Pro Item"},
      {"category":"Home","price":34.86,"name":"Eco Device"},
      {"category":"Electronics","price":39.06,"name":"Ultra Widget"},
      {"category":"Books","price":91.34,"name":"Deluxe Gadget"},
      {"category":"Apparel","price":41.76,"name":"Eco Tool"},
      {"category":"Apparel","price":39.58,"name":"Eco Kit"},
      {"category":"Books","price":125.74,"name":"Smart Tool"},
      {"category":"Apparel","price":156.3,"name":"Smart Tool"},
      {"category":"Home","price":123.46,"name":"Deluxe Kit"},
      {"category":"Toys","price":41.76,"name":"Eco Device"},
      {"category":"Electronics","price":103.38,"name":"Deluxe Widget"},
      {"category":"Home","price":130.07,"name":"Smart Set"},
      {"category":"Books","price":79.06,"name":"Deluxe Widget"},
      {"category":"Toys","price":149.67,"name":"Mini Set"},
      {"category":"Electronics","price":112.27,"name":"Pro Widget"}
    ],
    nextQuiz: 'q11'
  },
  'q11': {
    id: 'q11',
    title: 'Multi-cursor edits to convert to JSON',
    question: 'Download the file, use multi-cursors in VS Code to convert key=value pairs to JSON {key: value, ...}, then hash at tools-in-data-science.pages.dev/jsonhash',
    hint: 'Use Alt+Click or Ctrl+Alt+Up/Down for multi-cursor editing',
    nextQuiz: 'q12'
  },
  'q12': {
    id: 'q12',
    title: 'CSS: Featured-Sale Discount Sum',
    question: 'Using CSS selector for elements with both .featured and .sale classes, sum their data-discount values from the hidden product list.',
    hint: 'Use selector: .featured.sale and sum data-discount attributes',
    nextQuiz: 'q13'
  },
  'q13': {
    id: 'q13',
    title: 'Process files with different encodings',
    question: 'Download ZIP with data1.csv (CP-1252), data2.csv (UTF-8), data3.txt (UTF-16). Sum all values where symbol = \' OR Œ OR „',
    hint: 'Handle multiple encodings and filter by symbol',
    nextQuiz: 'q14'
  },
  'q14': {
    id: 'q14',
    title: 'Use GitHub',
    question: 'Create a public GitHub repository with a file email.json containing {"email": "23f2003700@ds.study.iitm.ac.in"}. Provide the raw GitHub URL.',
    hint: 'URL format: https://raw.githubusercontent.com/[USER]/[REPO]/main/email.json',
    nextQuiz: 'q15'
  },
  'q15': {
    id: 'q15',
    title: 'Replace across files',
    question: 'Download ZIP, replace all "IITM" (any case) with "IIT Madras" in all files, keep line endings. What is cat * | sha256sum?',
    hint: 'Use sed or find/replace, preserve line endings',
    nextQuiz: 'q16'
  },
  'q16': {
    id: 'q16',
    title: 'Move and rename files',
    question: 'Download ZIP, move all files to empty folder, rename files replacing digits: 1→2, 9→0, etc. What is grep . * | LC_ALL=C sort | sha256sum?',
    hint: 'Use mv and rename commands',
    nextQuiz: 'q17'
  },
  'q17': {
    id: 'q17',
    title: 'SQL: Average Order Value',
    question: 'Given orders table with status, quantity, unit_price columns, calculate average order value (quantity * unit_price) for shipped orders (case-insensitive).',
    hint: 'Use SQL: SELECT AVG(quantity * unit_price) FROM orders WHERE LOWER(status) = \'shipped\'',
    sampleData: [
      {status: 'Processing', quantity: 4, unit_price: 91.74},
      {status: 'shipped', quantity: 7, unit_price: 37.26},
      {status: 'shipped', quantity: 5, unit_price: 39.11},
      {status: 'Pending', quantity: 5, unit_price: 67.89},
      {status: 'shipped', quantity: 3, unit_price: 31.16}
    ],
    nextQuiz: 'q18'
  },
  'q18': {
    id: 'q18',
    title: 'Regex email validation',
    question: 'Count valid email addresses from: notanemail, @company.com, user123@domain.org, user.company.com, john.doe@company.com, user@, user@@company.com',
    hint: 'Valid email: chars before @, exactly one @, domain with dot, chars after dot',
    expectedAnswer: '2',
    nextQuiz: 'q19'
  },
  'q19': {
    id: 'q19',
    title: 'Compare files',
    question: 'Download ZIP with a.txt and b.txt (same number of lines). How many lines are different?',
    hint: 'Use diff or compare line by line',
    nextQuiz: 'q20'
  },
  'q20': {
    id: 'q20',
    title: 'Calculate variance',
    question: 'Download ZIP with 1000 measurements. Calculate sample variance (N-1 denominator) rounded to 2 decimal places.',
    hint: 'Use Python, Excel, or JavaScript to calculate variance',
    nextQuiz: null
  }
};

// HTML template for rendering questions
function renderQuizPage(quizId) {
  const quiz = quizzes[quizId];
  if (!quiz) return null;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${quiz.title} - GA1 Quiz</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .quiz-container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 { color: #333; margin-bottom: 10px; }
    .quiz-id { color: #666; font-size: 14px; margin-bottom: 20px; }
    .question {
      background: #f9f9f9;
      padding: 20px;
      border-radius: 5px;
      margin: 20px 0;
      border-left: 4px solid #007bff;
    }
    .hint {
      background: #fff3cd;
      padding: 10px;
      border-radius: 5px;
      margin: 15px 0;
      font-size: 14px;
      border-left: 3px solid #ffc107;
    }
    ${quiz.products ? '.products { font-size: 12px; max-height: 200px; overflow-y: auto; background: #f0f0f0; padding: 10px; border-radius: 3px; }' : ''}
    form {
      margin-top: 30px;
    }
    textarea {
      width: 100%;
      min-height: 120px;
      padding: 12px;
      border: 2px solid #ddd;
      border-radius: 5px;
      font-family: monospace;
      font-size: 14px;
      resize: vertical;
    }
    button {
      background: #007bff;
      color: white;
      padding: 12px 30px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
      margin-top: 15px;
    }
    button:hover {
      background: #0056b3;
    }
    .success {
      background: #d4edda;
      color: #155724;
      padding: 15px;
      border-radius: 5px;
      margin-top: 20px;
      border-left: 4px solid #28a745;
    }
  </style>
</head>
<body>
  <div class="quiz-container">
    <h1>${quiz.title}</h1>
    <div class="quiz-id">Question ID: ${quiz.id}</div>
    
    <div class="question">
      <strong>Question:</strong><br>
      ${quiz.question}
    </div>

    ${quiz.hint ? `<div class="hint"><strong>💡 Hint:</strong> ${quiz.hint}</div>` : ''}
    
    ${quiz.products ? `<div class="products"><strong>Products data:</strong><br><pre>${JSON.stringify(quiz.products, null, 2)}</pre></div>` : ''}
    
    ${quiz.sampleData ? `<div class="hint"><strong>📊 Sample Data:</strong><br><pre>${JSON.stringify(quiz.sampleData, null, 2)}</pre></div>` : ''}

    <form method="POST" action="/submit-quiz">
      <input type="hidden" name="quiz_id" value="${quiz.id}">
      <label for="answer"><strong>Your Answer:</strong></label><br>
      <textarea name="answer" id="answer" placeholder="Enter your answer here..." required></textarea><br>
      <button type="submit">Submit Answer</button>
    </form>
  </div>
</body>
</html>
  `;
}

// Routes
app.get('/', (req, res) => {
  res.send(`
    <h1>GA1 Quiz Server</h1>
    <p>Available quizzes:</p>
    <ul>
      ${Object.keys(quizzes).map(id => `<li><a href="/quiz/${id}">${quizzes[id].title}</a></li>`).join('')}
    </ul>
    <p><a href="/quiz/q1">Start Quiz →</a></p>
  `);
});

app.get('/quiz/:id', (req, res) => {
  const quizId = req.params.id;
  const html = renderQuizPage(quizId);
  
  if (!html) {
    return res.status(404).send('Quiz not found');
  }
  
  res.send(html);
});

// Track all submissions
const submissionLog = [];

app.post('/submit-quiz', (req, res) => {
  const { quiz_id, answer } = req.body;
  const quiz = quizzes[quiz_id];
  
  if (!quiz) {
    return res.status(404).send('Quiz not found');
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📝 SUBMISSION #${submissionLog.length + 1}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Quiz: ${quiz.title} (${quiz_id})`);
  console.log(`Answer Preview: ${answer.substring(0, 150)}${answer.length > 150 ? '...' : ''}`);
  
  // Check if answer is correct (for questions with expected answers)
  let isCorrect = null;
  if (quiz.expectedAnswer) {
    isCorrect = answer.trim() === quiz.expectedAnswer.trim();
    console.log(`Expected: ${quiz.expectedAnswer}`);
    console.log(`Result: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
  } else {
    console.log(`Result: ⚠️  No expected answer to verify`);
  }
  
  // Log submission
  const submission = {
    number: submissionLog.length + 1,
    timestamp: new Date().toISOString(),
    quiz_id,
    title: quiz.title,
    answer: answer.substring(0, 500),
    isCorrect,
    hasExpectedAnswer: !!quiz.expectedAnswer
  };
  submissionLog.push(submission);
  console.log(`${'='.repeat(60)}\n`);

  // If there's a next quiz, redirect to it
  if (quiz.nextQuiz) {
    const nextHtml = renderQuizPage(quiz.nextQuiz);
    return res.send(`
      <div style="font-family: Arial; max-width: 800px; margin: 50px auto; padding: 20px;">
        <div class="success" style="background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #28a745;">
          ✅ Answer submitted for: ${quiz.title}
          ${isCorrect !== null ? `<br><strong>Result: ${isCorrect ? 'CORRECT ✓' : 'INCORRECT ✗'}</strong>` : ''}
          <br>Your answer: ${answer.substring(0, 200)}${answer.length > 200 ? '...' : ''}
        </div>
        <a href="/quiz/${quiz.nextQuiz}" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Next Question →
        </a>
        <hr style="margin: 30px 0;">
        ${nextHtml}
      </div>
    `);
  }

  // Final quiz completed
  res.send(`
    <div style="font-family: Arial; max-width: 800px; margin: 50px auto; padding: 20px; text-align: center;">
      <h1>🎉 Quiz Complete!</h1>
      <div class="success" style="background: #d4edda; color: #155724; padding: 20px; border-radius: 5px; margin: 20px 0;">
        You have completed all 20 questions!
        ${isCorrect !== null ? `<br><br><strong>Final Answer: ${isCorrect ? 'CORRECT ✓' : 'INCORRECT ✗'}</strong>` : ''}
      </div>
      <a href="/" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
        Start Over
      </a>
    </div>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', quizCount: Object.keys(quizzes).length });
});

// Get submission log
app.get('/submissions', (req, res) => {
  const summary = {
    total: submissionLog.length,
    withExpectedAnswers: submissionLog.filter(s => s.hasExpectedAnswer).length,
    correct: submissionLog.filter(s => s.isCorrect === true).length,
    incorrect: submissionLog.filter(s => s.isCorrect === false).length,
    submissions: submissionLog
  };
  res.json(summary);
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 GA1 Quiz Server running at http://localhost:${PORT}`);
  console.log(`📝 Total questions: ${Object.keys(quizzes).length}`);
  console.log(`\n▶️  Start quiz: http://localhost:${PORT}/quiz/q1`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`\nQuestions available:`);
  Object.entries(quizzes).forEach(([id, quiz]) => {
    console.log(`  ${id}: ${quiz.title}`);
  });
});
