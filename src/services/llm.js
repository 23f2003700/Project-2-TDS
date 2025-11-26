/**
 * Enhanced Multi-LLM Service
 * Supports: Groq (Llama 3.3), Google Gemini, OpenAI (GPT-4), Claude with fallback chains
 */

const Groq = require('groq-sdk');
const logger = require('../utils/logger');

// Initialize clients (only if API keys are present)
let groq = null;
let openai = null;
let anthropic = null;
let gemini = null;

if (process.env.GROQ_API_KEY) {
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
  });
}

// Lazy-load Google Gemini
function getGemini() {
  if (!gemini && process.env.GOOGLE_API_KEY) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  }
  return gemini;
}

// Lazy-load OpenAI and Anthropic
function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    const OpenAI = require('openai');
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

function getAnthropic() {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    const Anthropic = require('@anthropic-ai/sdk');
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

// Model configurations
const MODELS = {
  GROQ_LLAMA: 'llama-3.3-70b-versatile',
  GROQ_LLAMA_VISION: 'llama-3.2-90b-vision-preview',
  GROQ_MIXTRAL: 'mixtral-8x7b-32768',
  WHISPER: 'whisper-large-v3-turbo'
};

// System prompt for quiz solving
const QUIZ_SYSTEM_PROMPT = `You are an expert data analyst and quiz solver. Your task is to solve data-related quiz questions accurately and concisely.

Key capabilities:
- Statistical analysis (mean, median, variance, regression, etc.)
- Data processing (filtering, sorting, aggregating, pivoting)
- Mathematical calculations (including complex formulas)
- CSV/JSON data manipulation
- Python/SQL code interpretation and execution
- Web scraping and API data extraction
- Date/time calculations
- Geo-spatial and network analysis
- Chart/visualization interpretation

CRITICAL RULES:
1. Provide ONLY the final answer - no explanations unless asked
2. For numbers, provide the exact numeric value
3. For booleans, respond with lowercase "true" or "false"
4. For JSON answers, provide valid minified JSON
5. For base64 answers, provide the complete data URI
6. Double-check all calculations
7. If you need to write code, provide executable Python code

Be extremely precise. Wrong answers are penalized.`;

/**
 * Analyze with primary model, fallback to alternatives on failure
 */
async function analyzeWithFallback(prompt, options = {}) {
  const {
    systemPrompt = QUIZ_SYSTEM_PROMPT,
    temperature = 0.1,
    maxTokens = 4000,
    expectJSON = false
  } = options;

  const models = [MODELS.GROQ_LLAMA, MODELS.GROQ_MIXTRAL];
  
  // Try Groq first
  if (groq) {
    for (const model of models) {
      try {
        logger.debug(`Trying Groq model: ${model}`);
        
        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ];

        const completion = await groq.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          response_format: expectJSON ? { type: 'json_object' } : undefined
        });

        const response = completion.choices[0]?.message?.content || '';
        
        if (response.trim()) {
          logger.debug(`Model ${model} succeeded`);
          return response.trim();
        }
      } catch (error) {
        logger.warn(`Model ${model} failed:`, error.message);
        continue;
      }
    }
  }

  // Try Google Gemini fallback (FREE!)
  const geminiClient = getGemini();
  if (geminiClient) {
    try {
      logger.debug('Falling back to Google Gemini');
      const model = geminiClient.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(`${systemPrompt}\n\n${prompt}`);
      const response = result.response.text();
      if (response.trim()) {
        logger.debug('Gemini succeeded');
        return response.trim();
      }
    } catch (error) {
      logger.warn('Gemini fallback failed:', error.message);
    }
  }

  // Try OpenAI fallback
  const openaiClient = getOpenAI();
  if (openaiClient) {
    try {
      logger.debug('Falling back to OpenAI GPT-4o');
      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature,
        max_tokens: maxTokens
      });
      
      const response = completion.choices[0]?.message?.content || '';
      if (response.trim()) return response.trim();
    } catch (error) {
      logger.warn('OpenAI fallback failed:', error.message);
    }
  }

  // Try Anthropic fallback
  const anthropicClient = getAnthropic();
  if (anthropicClient) {
    try {
      logger.debug('Falling back to Claude');
      const completion = await anthropicClient.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const response = completion.content[0]?.text || '';
      if (response.trim()) return response.trim();
    } catch (error) {
      logger.warn('Claude fallback failed:', error.message);
    }
  }

  throw new Error('All LLM models failed');
}

/**
 * Analyze text with vision capability for images
 */
async function analyzeWithVision(base64Image, question) {
  // Try Gemini Vision first (FREE and good quality)
  const geminiClient = getGemini();
  if (geminiClient) {
    try {
      logger.debug('Analyzing with Gemini Vision');
      const model = geminiClient.getGenerativeModel({ model: 'gemini-2.0-flash' });
      
      // Extract base64 data and mime type
      const matches = base64Image.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        
        const result = await model.generateContent([
          { text: `${question}\n\nProvide only the direct answer.` },
          { inlineData: { mimeType, data: base64Data } }
        ]);
        const response = result.response.text();
        if (response.trim()) {
          logger.debug('Gemini Vision succeeded');
          return response.trim();
        }
      }
    } catch (error) {
      logger.warn('Gemini Vision failed:', error.message);
    }
  }

  // Try OpenAI Vision (better quality)
  const openaiClient = getOpenAI();
  if (openaiClient) {
    try {
      logger.debug('Analyzing with GPT-4V');
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `${question}\n\nProvide only the direct answer.` },
              { type: 'image_url', image_url: { url: base64Image } }
            ]
          }
        ],
        max_tokens: 2000
      });
      return response.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
      logger.warn('GPT-4V failed:', error.message);
    }
  }

  // Try Groq Vision
  if (groq) {
    try {
      logger.debug('Analyzing with Groq Vision');
      const completion = await groq.chat.completions.create({
        model: MODELS.GROQ_LLAMA_VISION,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `${question}\n\nProvide only the direct answer.` },
              { type: 'image_url', image_url: { url: base64Image } }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });
      return completion.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
      logger.warn('Groq Vision failed:', error.message);
    }
  }

  // Try Claude Vision
  const anthropicClient = getAnthropic();
  if (anthropicClient) {
    try {
      logger.debug('Analyzing with Claude Vision');
      const mediaType = base64Image.includes('png') ? 'image/png' : 'image/jpeg';
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
      
      const response = await anthropicClient.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
              { type: 'text', text: `${question}\n\nProvide only the direct answer.` }
            ]
          }
        ]
      });
      return response.content[0]?.text?.trim() || '';
    } catch (error) {
      logger.warn('Claude Vision failed:', error.message);
    }
  }

  throw new Error('All vision models failed');
}

/**
 * Transcribe audio using Whisper
 */
async function transcribeAudio(audioBuffer, filename = 'audio.mp3') {
  // Try Groq Whisper first
  if (groq) {
    try {
      logger.debug('Transcribing audio with Groq Whisper');
      
      const audioFile = new File([audioBuffer], filename, { 
        type: filename.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg' 
      });
      
      const transcription = await groq.audio.transcriptions.create({
        file: audioFile,
        model: MODELS.WHISPER,
        response_format: 'json'
      });

      logger.debug('Transcription complete');
      return transcription.text;
    } catch (error) {
      logger.warn('Groq Whisper failed:', error.message);
    }
  }

  // Try OpenAI Whisper
  const openaiClient = getOpenAI();
  if (openaiClient) {
    try {
      logger.debug('Transcribing with OpenAI Whisper');
      const audioFile = new File([audioBuffer], filename, { 
        type: filename.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg' 
      });
      
      const transcription = await openaiClient.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1'
      });

      return transcription.text;
    } catch (error) {
      logger.warn('OpenAI Whisper failed:', error.message);
    }
  }

  throw new Error('All transcription services failed');
}

/**
 * Generate Python code to solve a problem
 */
async function generatePythonCode(problem) {
  const prompt = `Generate Python code to solve this problem. 
Return ONLY the code, no explanations. The code should print the final answer.

Problem: ${problem}

Requirements:
- Use only standard library + pandas, numpy, scipy if needed
- Code must be executable and print the answer
- Handle edge cases
- Be efficient

Python code:`;

  const code = await analyzeWithFallback(prompt, {
    systemPrompt: 'You are a Python expert. Generate only executable code, no markdown formatting.',
    temperature: 0.1
  });

  // Clean up code (remove markdown code blocks if present)
  return code
    .replace(/^```python\n?/i, '')
    .replace(/^```\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim();
}

/**
 * Solve a complex calculation step by step
 */
async function solveCalculation(problem) {
  const prompt = `Solve this calculation problem step by step, then provide ONLY the final numeric answer on the last line.

Problem: ${problem}

Show your work, then end with just the number.`;

  const response = await analyzeWithFallback(prompt, { temperature: 0 });
  
  // Extract the last number from response
  const lines = response.trim().split('\n');
  const lastLine = lines[lines.length - 1];
  const numMatch = lastLine.match(/-?\d+\.?\d*/);
  
  return numMatch ? parseFloat(numMatch[0]) : response;
}

/**
 * Parse and analyze JSON data
 */
async function analyzeJSON(jsonData, question) {
  const prompt = `Analyze this JSON data and answer the question.

JSON Data:
${typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData, null, 2)}

Question: ${question}

Provide only the direct answer.`;

  return analyzeWithFallback(prompt);
}

/**
 * Smart answer extraction - parses LLM response to correct type
 */
function extractAnswer(response) {
  const cleaned = response.trim();
  
  // Boolean check
  if (cleaned.toLowerCase() === 'true') return true;
  if (cleaned.toLowerCase() === 'false') return false;
  
  // Number check (integers and floats)
  const numMatch = cleaned.match(/^-?\d+\.?\d*$/);
  if (numMatch) return parseFloat(cleaned);
  
  // JSON check
  if ((cleaned.startsWith('{') && cleaned.endsWith('}')) ||
      (cleaned.startsWith('[') && cleaned.endsWith(']'))) {
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // Not valid JSON, return as string
    }
  }
  
  // Base64 data URI check
  if (cleaned.startsWith('data:')) {
    return cleaned;
  }
  
  return cleaned;
}

module.exports = {
  analyzeWithFallback,
  analyzeWithVision,
  transcribeAudio,
  generatePythonCode,
  solveCalculation,
  analyzeJSON,
  extractAnswer,
  QUIZ_SYSTEM_PROMPT,
  MODELS
};
