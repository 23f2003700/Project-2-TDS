/**
 * Text Question Processor
 * Handles text-based questions and analysis
 */

const groq = require('../services/groq');
const logger = require('../utils/logger');

async function processTextQuestion(questionText) {
  try {
    logger.info('Processing text question');

    const prompt = `You are answering a data analysis quiz question. Provide a direct, concise answer.

Question: ${questionText}

Instructions:
- If the answer is a number, respond with just the number
- If the answer is true/false, respond with just "true" or "false"
- If the answer is text, be concise and specific
- Do not explain your reasoning unless asked
- Focus on data analysis, statistics, and visualization concepts

Answer:`;

    const response = await groq.analyzeText(prompt);
    
    // Clean up response
    let answer = response.trim();
    
    // Try to parse as boolean
    if (answer.toLowerCase() === 'true') return true;
    if (answer.toLowerCase() === 'false') return false;
    
    // Try to parse as number
    const numMatch = answer.match(/^-?\d+\.?\d*$/);
    if (numMatch) return parseFloat(answer);
    
    logger.info('Text answer:', answer);
    return answer;
  } catch (error) {
    logger.error('Text question processing failed:', error);
    throw error;
  }
}

async function processPDFQuestion(pdfUrl, questionText) {
  try {
    logger.info('Processing PDF question:', pdfUrl);
    
    // For PDF links, we'll need to download and extract text
    // This is a simplified version - in production, you'd use pdf-parse or similar
    const prompt = `A question references a PDF at ${pdfUrl}. 

Question: ${questionText}

Based on typical data analysis quiz content, provide your best answer. If you need specific PDF content to answer, state that clearly.

Answer:`;

    const response = await groq.analyzeText(prompt);
    return response.trim();
  } catch (error) {
    logger.error('PDF question processing failed:', error);
    throw error;
  }
}

module.exports = {
  processTextQuestion,
  processPDFQuestion
};
