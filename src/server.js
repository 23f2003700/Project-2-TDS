/**
 * Express API Server v2.0
 * Enhanced quiz-solving agent with multi-LLM support
 * Endpoints: GET /, GET /health, GET /quiz, POST /quiz
 */

require('dotenv').config();
const express = require('express');

// Use enhanced quiz solver if available
let solveQuiz;
try {
  solveQuiz = require('./quiz-solver-v2').solveQuiz;
  console.log('✅ Using enhanced quiz solver v2.0');
} catch (e) {
  solveQuiz = require('./quiz-solver').solveQuiz;
  console.log('⚠️ Fallback to basic quiz solver');
}

const { launchBrowser, closeBrowser } = require('./services/browser');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// GET / - API Info
app.get('/', (req, res) => {
  res.json({
    name: 'LLM Quiz Solver API',
    version: '2.0.0',
    description: 'Intelligent quiz-solving agent using multi-LLM architecture (Groq + OpenAI + Claude)',
    endpoints: {
      health: 'GET /health - Health check',
      quiz_info: 'GET /quiz - API documentation',
      quiz_solve: 'POST /quiz - Solve quiz (requires email, secret, url)'
    },
    student: process.env.STUDENT_EMAIL,
    capabilities: [
      'Multi-LLM with fallback chains (Groq → OpenAI → Claude)',
      'Python code execution for calculations',
      'PDF, CSV, Excel, JSON processing',
      'Image analysis (GPT-4V/Claude Vision)',
      'Audio transcription (Whisper)',
      'Web scraping and API calls',
      'Intelligent question type detection',
      'Automatic retry with different strategies'
    ],
    status: 'running'
  });
});

// GET /health - Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    memory: process.memoryUsage()
  });
});

// GET /quiz - API Documentation
app.get('/quiz', (req, res) => {
  res.json({
    endpoint: 'POST /quiz',
    description: 'Submit a quiz URL to be solved automatically',
    required_fields: {
      email: 'Student email address',
      secret: 'Student secret key',
      url: 'Quiz URL to solve'
    },
    example_request: {
      email: '23f2003700@ds.study.iitm.ac.in',
      secret: 'iitm-quiz-secret-23f2003700-2025',
      url: 'https://tds-llm-analysis.s-anand.net/demo'
    },
    response_codes: {
      200: 'Valid request, quiz processed',
      400: 'Invalid JSON',
      403: 'Invalid secret'
    },
    features: [
      'Multi-LLM architecture with fallback chains',
      'JavaScript-rendered quiz pages (Playwright)',
      'Multiple question types (text, image, audio, CSV, PDF, JSON)',
      'Python code execution for complex calculations',
      'Image analysis with Vision models',
      'Audio transcription with Whisper',
      'Intelligent question type detection (14+ types)',
      'Automatic retry logic with different strategies',
      'Quiz chain following (up to 20 quizzes)',
      '3-minute time limit per quiz chain'
    ]
  });
});

// POST /quiz - Solve Quiz
app.post('/quiz', async (req, res) => {
  try {
    // Validate JSON
    if (!req.body || typeof req.body !== 'object') {
      logger.warn('Invalid JSON received');
      return res.status(400).json({
        error: 'Invalid JSON',
        message: 'Request body must be valid JSON'
      });
    }

    const { email, secret, url } = req.body;

    // Validate required fields
    if (!email || !secret || !url) {
      logger.warn('Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'email, secret, and url are required'
      });
    }

    // Validate secret
    const validEmail = process.env.STUDENT_EMAIL;
    const validSecret = process.env.STUDENT_SECRET;

    if (email !== validEmail || secret !== validSecret) {
      logger.warn('Invalid credentials:', { email, secret: '***' });
      return res.status(403).json({
        error: 'Invalid secret',
        message: 'Email or secret is incorrect'
      });
    }

    // Validate URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      logger.warn('Invalid URL:', url);
      return res.status(400).json({
        error: 'Invalid URL',
        message: 'URL must start with http:// or https://'
      });
    }

    logger.info('Quiz request accepted:', { email, url });

    // Launch browser if not already running
    await launchBrowser();

    // Solve quiz (runs in background, returns immediately)
    const quizPromise = solveQuiz(url, email, secret);

    // Return immediate response
    res.status(200).json({
      status: 'accepted',
      message: 'Quiz solving started',
      url: url,
      timestamp: new Date().toISOString()
    });

    // Wait for quiz to complete (in background)
    try {
      const result = await quizPromise;
      logger.info('Quiz completed successfully:', result);
    } catch (error) {
      logger.error('Quiz solving failed:', error);
    }
  } catch (error) {
    logger.error('Server error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Endpoint ${req.method} ${req.path} does not exist`
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
async function startServer() {
  try {
    // Validate environment variables
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not set in environment');
    }
    if (!process.env.STUDENT_EMAIL) {
      throw new Error('STUDENT_EMAIL not set in environment');
    }
    if (!process.env.STUDENT_SECRET) {
      throw new Error('STUDENT_SECRET not set in environment');
    }

    // Pre-launch browser
    logger.info('Pre-launching browser...');
    await launchBrowser();
    logger.info('Browser ready');

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Student: ${process.env.STUDENT_EMAIL}`);
      logger.info(`Headless mode: ${process.env.HEADLESS !== 'false'}`);
      logger.info('Ready to accept quiz requests!');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  await closeBrowser();
  process.exit(0);
});

// Start the server
startServer();
