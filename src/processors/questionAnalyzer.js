/**
 * Intelligent Question Analyzer
 * Detects question types and extracts key information
 */

const logger = require('../utils/logger');

// Question type patterns
const QUESTION_PATTERNS = {
  DOWNLOAD_FILE: /download\s+(?:the\s+)?(?:file|pdf|csv|excel|xlsx|json)/i,
  API_CALL: /(?:call|fetch|request|get\s+data\s+from)\s+(?:the\s+)?(?:api|endpoint)/i,
  SCRAPE_WEBSITE: /(?:scrape|extract|get)\s+(?:data\s+)?from\s+(?:the\s+)?(?:website|page)/i,
  SUM_COLUMN: /(?:sum|total)\s+(?:of\s+)?(?:the\s+)?["']?(\w+)["']?\s*(?:column)?/i,
  AVERAGE: /(?:average|mean)\s+(?:of\s+)?(?:the\s+)?["']?(\w+)["']?/i,
  COUNT: /(?:count|number\s+of|how\s+many)/i,
  FILTER: /(?:filter|where|only|with)\s+(?:the\s+)?/i,
  SORT: /(?:sort|order)\s+(?:by\s+)?/i,
  MAX_MIN: /(?:maximum|minimum|max|min|largest|smallest|highest|lowest)/i,
  DATE_CALC: /(?:days?\s+between|weekend|saturday|sunday|date\s+range)/i,
  VARIANCE: /(?:variance|std|standard\s+deviation)/i,
  REGRESSION: /(?:regression|correlation|r-squared|predict)/i,
  VISUALIZATION: /(?:chart|graph|plot|visualiz|histogram|scatter|bar\s+chart)/i,
  JSON_TRANSFORM: /(?:transform|convert|restructure|reshape)\s+(?:the\s+)?json/i,
  BASE64: /(?:base64|data\s*uri|encode\s+as)/i,
  TRANSCRIBE: /(?:transcribe|audio|speech|listen|recording)/i,
  IMAGE_ANALYZE: /(?:image|picture|photo|screenshot|what\s+is\s+in\s+the)/i,
  NETWORK_ANALYSIS: /(?:network|graph\s+analysis|nodes|edges|connected|path)/i,
  GEOSPATIAL: /(?:geospatial|latitude|longitude|coordinates|distance|map)/i,
  SQL_QUERY: /(?:sql|query|select\s+from|database)/i
};

// File type patterns
const FILE_PATTERNS = {
  PDF: /\.pdf(?:\?|$)/i,
  CSV: /\.csv(?:\?|$)/i,
  EXCEL: /\.(xlsx?|xls)(?:\?|$)/i,
  JSON: /\.json(?:\?|$)/i,
  IMAGE: /\.(png|jpg|jpeg|gif|webp|svg)(?:\?|$)/i,
  AUDIO: /\.(mp3|wav|ogg|m4a|webm)(?:\?|$)/i,
  ZIP: /\.zip(?:\?|$)/i
};

/**
 * Analyze question and determine type and strategy
 */
function analyzeQuestion(questionText, links = []) {
  const analysis = {
    types: [],
    fileLinks: [],
    apiEndpoints: [],
    strategy: null,
    keyEntities: {},
    complexity: 'simple'
  };
  
  const text = questionText.toLowerCase();
  
  // Detect question types
  for (const [type, pattern] of Object.entries(QUESTION_PATTERNS)) {
    if (pattern.test(questionText)) {
      analysis.types.push(type);
      
      // Extract captured groups if any
      const match = questionText.match(pattern);
      if (match && match[1]) {
        analysis.keyEntities[type] = match[1];
      }
    }
  }
  
  // Analyze links for file types
  for (const link of links) {
    const url = typeof link === 'string' ? link : link.url || link.href;
    if (!url) continue;
    
    for (const [fileType, pattern] of Object.entries(FILE_PATTERNS)) {
      if (pattern.test(url)) {
        analysis.fileLinks.push({ url, type: fileType });
        break;
      }
    }
    
    // Check for API endpoints
    if (url.includes('/api/') || url.includes('api.') || 
        url.endsWith('.json') || url.includes('endpoint')) {
      analysis.apiEndpoints.push(url);
    }
  }
  
  // Determine strategy
  analysis.strategy = determineStrategy(analysis);
  
  // Estimate complexity
  if (analysis.types.length > 2 || 
      analysis.types.includes('REGRESSION') ||
      analysis.types.includes('NETWORK_ANALYSIS') ||
      analysis.types.includes('GEOSPATIAL')) {
    analysis.complexity = 'complex';
  } else if (analysis.types.length > 1 || 
             analysis.fileLinks.length > 0) {
    analysis.complexity = 'medium';
  }
  
  logger.info('Question analysis:', JSON.stringify(analysis, null, 2));
  return analysis;
}

/**
 * Determine the best strategy for solving the question
 */
function determineStrategy(analysis) {
  const { types, fileLinks, apiEndpoints } = analysis;
  
  // Priority order of strategies
  
  // 1. File download and process
  if (fileLinks.length > 0) {
    const fileType = fileLinks[0].type;
    
    if (fileType === 'PDF') {
      return { type: 'PROCESS_PDF', fileUrl: fileLinks[0].url };
    }
    if (fileType === 'CSV' || fileType === 'EXCEL') {
      return { type: 'PROCESS_DATA', fileUrl: fileLinks[0].url, format: fileType };
    }
    if (fileType === 'JSON') {
      return { type: 'PROCESS_JSON', fileUrl: fileLinks[0].url };
    }
    if (fileType === 'AUDIO') {
      return { type: 'TRANSCRIBE_AUDIO', fileUrl: fileLinks[0].url };
    }
    if (fileType === 'IMAGE') {
      return { type: 'ANALYZE_IMAGE', fileUrl: fileLinks[0].url };
    }
  }
  
  // 2. API call
  if (apiEndpoints.length > 0 || types.includes('API_CALL')) {
    return { type: 'CALL_API', endpoints: apiEndpoints };
  }
  
  // 3. Web scraping
  if (types.includes('SCRAPE_WEBSITE')) {
    return { type: 'SCRAPE_PAGE' };
  }
  
  // 4. Visualization
  if (types.includes('VISUALIZATION')) {
    return { type: 'GENERATE_CHART' };
  }
  
  // 5. Complex calculation
  if (types.includes('REGRESSION') || types.includes('VARIANCE') ||
      types.includes('NETWORK_ANALYSIS') || types.includes('GEOSPATIAL')) {
    return { type: 'PYTHON_ANALYSIS' };
  }
  
  // 6. Date calculation
  if (types.includes('DATE_CALC')) {
    return { type: 'DATE_CALCULATION' };
  }
  
  // 7. Simple calculation or text question
  if (types.includes('SUM_COLUMN') || types.includes('AVERAGE') ||
      types.includes('MAX_MIN') || types.includes('COUNT')) {
    return { type: 'DATA_CALCULATION' };
  }
  
  // Default: LLM analysis
  return { type: 'LLM_ANALYSIS' };
}

/**
 * Extract submission URL from page content
 */
function extractSubmissionUrl(text) {
  // Pattern for POST submission URL
  const patterns = [
    /post\s+(?:your\s+)?(?:answer\s+)?to\s+(https?:\/\/[^\s<>"']+)/i,
    /submit\s+(?:to|at)\s+(https?:\/\/[^\s<>"']+)/i,
    /(?:submission|endpoint)[^:]*:\s*(https?:\/\/[^\s<>"']+)/i,
    /(https?:\/\/[^\s<>"']*submit[^\s<>"']*)/i,
    /(https?:\/\/[^\s<>"']*answer[^\s<>"']*)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].replace(/[.,;:!?]$/, ''); // Remove trailing punctuation
    }
  }
  
  return null;
}

/**
 * Extract expected answer format
 */
function extractAnswerFormat(text) {
  const formats = {
    boolean: /answer\s+(?:is\s+)?(?:a\s+)?(?:true|false|boolean)/i,
    number: /answer\s+(?:is\s+)?(?:a\s+)?(?:number|numeric|integer|float)/i,
    json: /answer\s+(?:is\s+)?(?:a\s+)?(?:json|object|array)/i,
    base64: /answer\s+(?:is\s+)?(?:a\s+)?(?:base64|data\s*uri)/i,
    string: /answer\s+(?:is\s+)?(?:a\s+)?(?:string|text)/i
  };
  
  for (const [format, pattern] of Object.entries(formats)) {
    if (pattern.test(text)) {
      return format;
    }
  }
  
  // Infer from context
  if (text.includes('"answer": {') || text.includes("'answer': {")) {
    return 'json';
  }
  if (text.includes('true or false') || text.includes('yes or no')) {
    return 'boolean';
  }
  
  return 'auto'; // Let the system figure it out
}

/**
 * Extract date range from question
 */
function extractDateRange(text) {
  // Pattern: YYYY-MM-DD to YYYY-MM-DD
  const isoPattern = /(\d{4}-\d{2}-\d{2})\s+(?:to|and|through|-)\s+(\d{4}-\d{2}-\d{2})/i;
  const match = text.match(isoPattern);
  
  if (match) {
    return { start: match[1], end: match[2] };
  }
  
  // Pattern: Month DD, YYYY
  const textPattern = /(\w+\s+\d{1,2},?\s+\d{4})\s+(?:to|and|through|-)\s+(\w+\s+\d{1,2},?\s+\d{4})/i;
  const textMatch = text.match(textPattern);
  
  if (textMatch) {
    return { start: textMatch[1], end: textMatch[2], format: 'text' };
  }
  
  return null;
}

/**
 * Extract column name from question
 */
function extractColumnName(text) {
  // Patterns for column references
  const patterns = [
    /["'](\w+)["']\s*column/i,
    /column\s*["'](\w+)["']/i,
    /(?:sum|average|mean|count|max|min)\s+(?:of\s+)?(?:the\s+)?["']?(\w+)["']?/i,
    /(\w+)\s+(?:field|column|values)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

module.exports = {
  analyzeQuestion,
  determineStrategy,
  extractSubmissionUrl,
  extractAnswerFormat,
  extractDateRange,
  extractColumnName,
  QUESTION_PATTERNS,
  FILE_PATTERNS
};
