/**
 * Enhanced Quiz Solver v2.0
 * Intelligent agent with multiple strategies
 */

const browser = require('./services/browser');
const { analyzeWithFallback, analyzeWithVision, transcribeAudio, extractAnswer, generatePythonCode } = require('./services/llm');
const { executePython, countWeekendDays, calculateStatistics, processJSONData } = require('./services/codeExecutor');
const { downloadFile, parsePDF, parseCSV, analyzeFileContent, processCSVFile } = require('./services/fileProcessor');
const { scrapeWebsite, callAPI, executeAPIInstructions } = require('./services/webScraper');
const { analyzeQuestion, extractSubmissionUrl, extractAnswerFormat, extractDateRange, extractColumnName } = require('./processors/questionAnalyzer');
const logger = require('./utils/logger');

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const MAX_QUIZ_CHAIN = 20;
const TIME_LIMIT = 170000; // 2 minutes 50 seconds (leave buffer before 3 min)

/**
 * Main quiz solving entry point
 */
async function solveQuiz(initialUrl, email, secret) {
  const startTime = Date.now();
  let currentUrl = initialUrl;
  let quizCount = 0;
  const results = [];

  try {
    logger.info('='.repeat(60));
    logger.info('🚀 QUIZ SOLVER v2.0 STARTED');
    logger.info('='.repeat(60));
    logger.info(`Initial URL: ${initialUrl}`);
    logger.info(`Email: ${email}`);

    while (currentUrl && quizCount < MAX_QUIZ_CHAIN) {
      quizCount++;
      const elapsed = Date.now() - startTime;
      
      if (elapsed > TIME_LIMIT) {
        logger.warn(`⏰ Time limit approaching (${Math.round(elapsed/1000)}s), stopping`);
        break;
      }

      logger.info(`\n${'='.repeat(40)}`);
      logger.info(`📝 QUIZ ${quizCount} (${Math.round(elapsed/1000)}s elapsed)`);
      logger.info(`URL: ${currentUrl}`);
      logger.info('='.repeat(40));

      const result = await solveQuizPage(currentUrl, email, secret, startTime);
      results.push(result);

      if (result.nextUrl) {
        currentUrl = result.nextUrl;
        logger.info(`➡️ Moving to next quiz: ${currentUrl}`);
      } else {
        logger.info('🏁 Quiz chain complete');
        break;
      }
    }

    const totalTime = (Date.now() - startTime) / 1000;
    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`✅ COMPLETED ${quizCount} quizzes in ${totalTime.toFixed(2)}s`);
    logger.info('='.repeat(60));

    return { success: true, quizCount, totalTime, results };
  } catch (error) {
    logger.error('❌ Quiz solver failed:', error);
    throw error;
  }
}

/**
 * Solve a single quiz page
 */
async function solveQuizPage(url, email, secret, startTime) {
  let page = null;
  let retries = 0;
  let lastAnswer = null;
  let lastError = null;

  while (retries < MAX_RETRIES) {
    const elapsed = Date.now() - startTime;
    if (elapsed > TIME_LIMIT) {
      return { success: false, url, error: 'Time limit exceeded' };
    }

    try {
      // Create new page
      page = await browser.createPage();
      
      // Navigate to quiz
      logger.info('🌐 Loading quiz page...');
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000); // Let JS render

      // Extract question content
      const questionData = await extractQuestionData(page);
      logger.info(`📋 Question: ${questionData.text.substring(0, 200)}...`);
      
      // Analyze question type
      const analysis = analyzeQuestion(questionData.text, questionData.links);
      logger.info(`🔍 Strategy: ${analysis.strategy.type}`);

      // Get submission URL - for tds-llm-analysis, always use /submit
      let submissionUrl = extractSubmissionUrl(questionData.text) || questionData.formAction;
      if (!submissionUrl) {
        // Default to same origin /submit
        const urlObj = new URL(url);
        submissionUrl = `${urlObj.origin}/submit`;
      }
      logger.info(`📮 Submit to: ${submissionUrl}`);

      // Solve based on strategy
      const answer = await executeStrategy(page, questionData, analysis, retries, lastAnswer);
      logger.info(`💡 Answer: ${JSON.stringify(answer).substring(0, 200)}`);
      lastAnswer = answer;

      // Submit answer
      const response = await submitAnswer(submissionUrl, answer, email, secret, url);
      logger.info(`📬 Response: ${JSON.stringify(response)}`);

      await page.close();
      page = null;

      if (response.correct === true) {
        logger.info('✅ CORRECT!');
        return {
          success: true,
          url,
          answer,
          nextUrl: response.url,
          attempts: retries + 1
        };
      } else {
        logger.warn(`❌ INCORRECT (attempt ${retries + 1}/${MAX_RETRIES}): ${response.reason || 'Unknown'}`);
        lastError = response.reason;
        
        // If we got a next URL even though wrong, we can skip to it
        if (response.url) {
          logger.info('📌 Got next URL despite wrong answer, moving on');
          return {
            success: false,
            url,
            answer,
            nextUrl: response.url,
            reason: response.reason,
            attempts: retries + 1
          };
        }
        
        retries++;
        if (retries < MAX_RETRIES) {
          logger.info(`⏳ Retrying in ${RETRY_DELAY/1000}s...`);
          await new Promise(r => setTimeout(r, RETRY_DELAY));
        }
      }
    } catch (error) {
      logger.error(`💥 Attempt ${retries + 1} error: ${error.message}`);
      lastError = error.message;
      retries++;
      
      if (page) {
        await page.close().catch(() => {});
        page = null;
      }
      
      if (retries < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY));
      }
    }
  }

  return { success: false, url, error: lastError || 'Max retries exceeded', attempts: retries };
}

/**
 * Extract question data from page
 */
async function extractQuestionData(page) {
  const data = await page.evaluate(() => {
    const result = {
      text: '',
      links: [],
      images: [],
      audio: [],
      formAction: null,
      tables: []
    };

    // Get all text content
    result.text = document.body.innerText || document.body.textContent || '';

    // Get all links
    document.querySelectorAll('a[href]').forEach(a => {
      result.links.push({
        text: a.textContent.trim(),
        url: a.href
      });
    });

    // Get images
    document.querySelectorAll('img[src]').forEach(img => {
      result.images.push({
        src: img.src,
        alt: img.alt
      });
    });

    // Get audio
    document.querySelectorAll('audio source, audio[src]').forEach(audio => {
      result.audio.push(audio.src || audio.querySelector('source')?.src);
    });

    // Get form action
    const form = document.querySelector('form[action]');
    if (form) {
      result.formAction = form.action;
    }

    // Get tables
    document.querySelectorAll('table').forEach(table => {
      const headers = [];
      const rows = [];
      table.querySelectorAll('th').forEach(th => headers.push(th.textContent.trim()));
      table.querySelectorAll('tr').forEach(tr => {
        const row = [];
        tr.querySelectorAll('td').forEach(td => row.push(td.textContent.trim()));
        if (row.length) rows.push(row);
      });
      result.tables.push({ headers, rows });
    });

    return result;
  });

  return data;
}

/**
 * Execute solving strategy
 */
async function executeStrategy(page, questionData, analysis, retryNum, previousAnswer) {
  const { strategy, types } = analysis;
  const question = questionData.text;

  try {
    switch (strategy.type) {
      case 'PROCESS_PDF':
        return await processPDFStrategy(strategy.fileUrl, question);

      case 'PROCESS_DATA':
        return await processDataStrategy(strategy.fileUrl, question, strategy.format);

      case 'PROCESS_JSON':
        return await processJSONStrategy(strategy.fileUrl, question);

      case 'TRANSCRIBE_AUDIO':
        return await processAudioStrategy(strategy.fileUrl, question);

      case 'ANALYZE_IMAGE':
        return await processImageStrategy(page, questionData, question);

      case 'CALL_API':
        return await processAPIStrategy(question, strategy.endpoints);

      case 'SCRAPE_PAGE':
        return await processScrapingStrategy(page, question);

      case 'GENERATE_CHART':
        return await processChartStrategy(question, questionData);

      case 'PYTHON_ANALYSIS':
        return await processPythonStrategy(question, questionData);

      case 'DATE_CALCULATION':
        return await processDateStrategy(question);

      case 'DATA_CALCULATION':
        return await processCalculationStrategy(question, questionData);

      case 'LLM_ANALYSIS':
      default:
        // If retrying, modify approach
        if (retryNum > 0 && previousAnswer !== null) {
          return await processWithRefinement(question, previousAnswer, retryNum);
        }
        return await processLLMStrategy(question, questionData);
    }
  } catch (error) {
    logger.error(`Strategy ${strategy.type} failed:`, error);
    // Fallback to LLM
    return await processLLMStrategy(question, questionData);
  }
}

/**
 * Process PDF files
 */
async function processPDFStrategy(pdfUrl, question) {
  logger.info('📄 Processing PDF...');
  const { buffer } = await downloadFile(pdfUrl);
  const text = await parsePDF(buffer);
  
  const prompt = `PDF Content:
${text.substring(0, 8000)}

Question: ${question}

Analyze the PDF content and provide the direct answer.`;

  const response = await analyzeWithFallback(prompt);
  return extractAnswer(response);
}

/**
 * Process data files (CSV, Excel)
 */
async function processDataStrategy(fileUrl, question, format) {
  logger.info(`📊 Processing ${format} data...`);
  return await processCSVFile(fileUrl, question);
}

/**
 * Process JSON files
 */
async function processJSONStrategy(jsonUrl, question) {
  logger.info('📋 Processing JSON...');
  const { buffer } = await downloadFile(jsonUrl);
  const jsonData = JSON.parse(buffer.toString('utf-8'));
  
  // Check if question needs JSON manipulation
  const questionLower = question.toLowerCase();
  
  if (questionLower.includes('filter') || questionLower.includes('sort') || 
      questionLower.includes('transform')) {
    // Use Python for complex JSON operations
    const code = await generatePythonCode(`
Given this JSON data: ${JSON.stringify(jsonData).substring(0, 2000)}

${question}

Print only the final answer.`);
    
    const result = await executePython(code);
    return extractAnswer(result);
  }

  // Simple JSON analysis with LLM
  const prompt = `JSON Data:
${JSON.stringify(jsonData, null, 2).substring(0, 5000)}

Question: ${question}

Provide the direct answer.`;

  const response = await analyzeWithFallback(prompt);
  return extractAnswer(response);
}

/**
 * Process audio files
 */
async function processAudioStrategy(audioUrl, question) {
  logger.info('🎵 Processing audio...');
  const { buffer } = await downloadFile(audioUrl);
  const transcript = await transcribeAudio(buffer);
  
  logger.info(`Transcript: ${transcript.substring(0, 200)}...`);
  
  const prompt = `Audio Transcript:
${transcript}

Question: ${question}

Based on the transcript, provide the direct answer.`;

  const response = await analyzeWithFallback(prompt);
  return extractAnswer(response);
}

/**
 * Process images
 */
async function processImageStrategy(page, questionData, question) {
  logger.info('🖼️ Processing image...');
  
  // Get image URL
  const imageUrl = questionData.images[0]?.src;
  if (!imageUrl) {
    // Take screenshot of page
    const screenshot = await page.screenshot({ type: 'png' });
    const base64 = `data:image/png;base64,${screenshot.toString('base64')}`;
    return await analyzeWithVision(base64, question);
  }

  // Check if question asks for base64
  if (question.toLowerCase().includes('base64') || question.toLowerCase().includes('data uri')) {
    const { buffer, contentType } = await downloadFile(imageUrl);
    const mimeType = contentType.split(';')[0] || 'image/png';
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }

  const { buffer } = await downloadFile(imageUrl);
  const base64 = `data:image/png;base64,${buffer.toString('base64')}`;
  return await analyzeWithVision(base64, question);
}

/**
 * Process API calls
 */
async function processAPIStrategy(question, endpoints) {
  logger.info('🔌 Processing API call...');
  
  if (endpoints && endpoints.length > 0) {
    const result = await callAPI(endpoints[0]);
    
    const prompt = `API Response:
${JSON.stringify(result.data, null, 2).substring(0, 5000)}

Question: ${question}

Analyze the API response and provide the direct answer.`;

    const response = await analyzeWithFallback(prompt);
    return extractAnswer(response);
  }

  // Extract API info from question and execute
  return await executeAPIInstructions(question);
}

/**
 * Process web scraping
 */
async function processScrapingStrategy(page, question) {
  logger.info('🕷️ Scraping page...');
  const scraped = await scrapeWebsite(page);
  
  const prompt = `Scraped Content:
Title: ${scraped.title}
Text: ${scraped.text.substring(0, 5000)}
Tables: ${JSON.stringify(scraped.tables).substring(0, 2000)}

Question: ${question}

Provide the direct answer.`;

  const response = await analyzeWithFallback(prompt);
  return extractAnswer(response);
}

/**
 * Generate charts
 */
async function processChartStrategy(question, questionData) {
  logger.info('📈 Generating chart...');
  
  // Generate Python code for chart
  const code = await generatePythonCode(`
${question}

Generate a chart and save it as a PNG file at '/tmp/chart.png'.
After saving, read the file and print the base64 encoded content.

Use matplotlib. Make the chart clean and readable.

import base64
# ... generate and save chart ...
with open('/tmp/chart.png', 'rb') as f:
    print('data:image/png;base64,' + base64.b64encode(f.read()).decode())
`);

  try {
    const result = await executePython(code);
    return result;
  } catch (error) {
    logger.warn('Chart generation failed, falling back to LLM');
    const response = await analyzeWithFallback(question);
    return extractAnswer(response);
  }
}

/**
 * Complex Python analysis
 */
async function processPythonStrategy(question, questionData) {
  logger.info('🐍 Python analysis...');
  
  const code = await generatePythonCode(question);
  logger.info(`Generated code:\n${code.substring(0, 500)}...`);
  
  const result = await executePython(code);
  return extractAnswer(result);
}

/**
 * Date calculations
 */
async function processDateStrategy(question) {
  logger.info('📅 Date calculation...');
  
  const dateRange = extractDateRange(question);
  
  if (dateRange && question.toLowerCase().includes('weekend')) {
    const count = await countWeekendDays(dateRange.start, dateRange.end);
    return count;
  }

  // Fallback to Python
  const code = await generatePythonCode(question);
  const result = await executePython(code);
  return extractAnswer(result);
}

/**
 * Simple data calculations
 */
async function processCalculationStrategy(question, questionData) {
  logger.info('🧮 Data calculation...');
  
  // If we have tables, use them
  if (questionData.tables && questionData.tables.length > 0) {
    const table = questionData.tables[0];
    const columnName = extractColumnName(question);
    
    if (columnName) {
      const colIndex = table.headers.indexOf(columnName);
      if (colIndex >= 0) {
        const values = table.rows.map(r => parseFloat(r[colIndex])).filter(v => !isNaN(v));
        
        if (question.toLowerCase().includes('sum')) {
          return values.reduce((a, b) => a + b, 0);
        }
        if (question.toLowerCase().includes('average') || question.toLowerCase().includes('mean')) {
          return values.reduce((a, b) => a + b, 0) / values.length;
        }
        if (question.toLowerCase().includes('max')) {
          return Math.max(...values);
        }
        if (question.toLowerCase().includes('min')) {
          return Math.min(...values);
        }
        if (question.toLowerCase().includes('count')) {
          return values.length;
        }
      }
    }
  }

  // Fallback to LLM
  return await processLLMStrategy(question, questionData);
}

/**
 * Default LLM analysis
 */
async function processLLMStrategy(question, questionData) {
  logger.info('🤖 LLM analysis...');
  
  let context = '';
  
  if (questionData.tables && questionData.tables.length > 0) {
    context += `\nTables on page:\n${JSON.stringify(questionData.tables).substring(0, 2000)}`;
  }
  
  if (questionData.links && questionData.links.length > 0) {
    context += `\nLinks: ${questionData.links.map(l => l.url).join(', ').substring(0, 500)}`;
  }

  const prompt = `${question}
${context}

Provide the direct answer. Be precise.`;

  const response = await analyzeWithFallback(prompt);
  return extractAnswer(response);
}

/**
 * Refine answer after failed attempt
 */
async function processWithRefinement(question, previousAnswer, retryNum) {
  logger.info(`🔄 Refining answer (attempt ${retryNum + 1})...`);

  const prompt = `Previous answer "${previousAnswer}" was incorrect.

Question: ${question}

Provide a different answer. Consider:
- Check calculations again
- Consider different interpretations
- Be more precise with numeric answers
- Check for off-by-one errors in counts

New answer:`;

  const response = await analyzeWithFallback(prompt, { temperature: 0.3 * retryNum });
  return extractAnswer(response);
}

/**
 * Ensure answer is properly formatted as a string for submission
 */
function formatAnswerForSubmission(answer) {
  // If answer is null/undefined, return empty string
  if (answer === null || answer === undefined) {
    return '';
  }
  
  // If answer is a boolean, return lowercase string
  if (typeof answer === 'boolean') {
    return answer.toString();
  }
  
  // If answer is a number, return as string
  if (typeof answer === 'number') {
    return answer.toString();
  }
  
  // If answer is an object/array, check if it has an "answer" field
  if (typeof answer === 'object') {
    // If it's a JSON object with an "answer" field, extract it
    if (answer.answer !== undefined) {
      return formatAnswerForSubmission(answer.answer);
    }
    // Otherwise stringify the object
    return JSON.stringify(answer);
  }
  
  // If it's already a string, return as-is
  return String(answer);
}

/**
 * Submit answer to quiz endpoint
 */
async function submitAnswer(submissionUrl, answer, email, secret, quizUrl) {
  const fetch = require('node-fetch');
  
  // CRITICAL: Ensure answer is always a string
  const formattedAnswer = formatAnswerForSubmission(answer);
  
  const payload = {
    email,
    secret,
    url: quizUrl,
    answer: formattedAnswer
  };

  logger.info(`Submitting to: ${submissionUrl}`);
  logger.info(`Original answer type: ${typeof answer}`);
  logger.info(`Formatted answer: ${formattedAnswer.substring(0, 200)}`);
  logger.info(`Payload: ${JSON.stringify(payload).substring(0, 500)}`);

  try {
    const response = await fetch(submissionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
      timeout: 30000
    });

    const text = await response.text();
    logger.info(`Raw response: ${text.substring(0, 500)}`);

    try {
      return JSON.parse(text);
    } catch (e) {
      return { correct: false, reason: text };
    }
  } catch (error) {
    logger.error('Submission failed:', error);
    throw error;
  }
}

module.exports = {
  solveQuiz
};
