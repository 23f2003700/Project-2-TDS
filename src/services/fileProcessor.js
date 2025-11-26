/**
 * Enhanced File Processor
 * Handles PDF, CSV, Excel, JSON, and other file types
 */

const fetch = require('node-fetch');
const logger = require('../utils/logger');
const { analyzeWithFallback, extractAnswer } = require('./llm');
const { executePython, analyzeCSVWithPython } = require('./codeExecutor');

/**
 * Download file from URL
 */
async function downloadFile(url) {
  try {
    logger.info('Downloading file:', url);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const buffer = await response.buffer();
    const contentType = response.headers.get('content-type') || '';
    
    logger.info(`Downloaded ${buffer.length} bytes, type: ${contentType}`);
    return { buffer, contentType };
  } catch (error) {
    logger.error('Download failed:', error);
    throw error;
  }
}

/**
 * Parse PDF and extract text
 */
async function parsePDF(buffer) {
  try {
    // Try using pdf-parse if available
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      logger.info(`PDF parsed: ${data.numpages} pages, ${data.text.length} chars`);
      return data.text;
    } catch (e) {
      // Fallback: use Python with PyPDF2
      const fs = require('fs').promises;
      const path = require('path');
      const os = require('os');
      
      const tempPath = path.join(os.tmpdir(), `quiz_pdf_${Date.now()}.pdf`);
      await fs.writeFile(tempPath, buffer);
      
      const code = `
import sys
try:
    from PyPDF2 import PdfReader
except ImportError:
    from pypdf import PdfReader

reader = PdfReader("${tempPath.replace(/\\/g, '/')}")
text = ""
for page in reader.pages:
    text += page.extract_text() + "\\n"
print(text)
`;
      
      const text = await executePython(code);
      await fs.unlink(tempPath).catch(() => {});
      return text;
    }
  } catch (error) {
    logger.error('PDF parsing failed:', error);
    throw error;
  }
}

/**
 * Parse CSV content
 */
async function parseCSV(content) {
  try {
    // Simple CSV parsing
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((h, i) => {
        row[h] = values[i];
      });
      return row;
    });
    
    return { headers, rows, raw: content };
  } catch (error) {
    logger.error('CSV parsing failed:', error);
    throw error;
  }
}

/**
 * Parse JSON file
 */
async function parseJSON(content) {
  try {
    return JSON.parse(content);
  } catch (error) {
    logger.error('JSON parsing failed:', error);
    throw error;
  }
}

/**
 * Analyze file content based on type
 */
async function analyzeFileContent(url, question) {
  const { buffer, contentType } = await downloadFile(url);
  
  const ext = url.toLowerCase().split('.').pop().split('?')[0];
  let content;
  
  // Determine file type
  if (ext === 'pdf' || contentType.includes('pdf')) {
    content = await parsePDF(buffer);
    logger.info('Parsed PDF content:', content.substring(0, 500));
  } else if (ext === 'csv' || contentType.includes('csv')) {
    content = buffer.toString('utf-8');
    const parsed = await parseCSV(content);
    content = `CSV with ${parsed.rows.length} rows, columns: ${parsed.headers.join(', ')}\n\nData preview:\n${content.substring(0, 2000)}`;
  } else if (ext === 'json' || contentType.includes('json')) {
    content = buffer.toString('utf-8');
    const parsed = await parseJSON(content);
    content = `JSON data:\n${JSON.stringify(parsed, null, 2).substring(0, 3000)}`;
  } else if (ext === 'xlsx' || ext === 'xls' || contentType.includes('excel') || contentType.includes('spreadsheet')) {
    // Use Python for Excel files
    const fs = require('fs').promises;
    const path = require('path');
    const os = require('os');
    
    const tempPath = path.join(os.tmpdir(), `quiz_excel_${Date.now()}.${ext}`);
    await fs.writeFile(tempPath, buffer);
    
    const code = `
import pandas as pd
df = pd.read_excel("${tempPath.replace(/\\/g, '/')}")
print(df.to_string())
`;
    content = await executePython(code);
    await fs.unlink(tempPath).catch(() => {});
  } else {
    // Default: treat as text
    content = buffer.toString('utf-8');
  }
  
  // Now analyze with LLM
  const prompt = `Analyze this file content and answer the question precisely.

File content:
${content.substring(0, 6000)}

Question: ${question}

Provide only the direct answer.`;

  const response = await analyzeWithFallback(prompt);
  return extractAnswer(response);
}

/**
 * Download and process CSV for data operations
 */
async function processCSVFile(url, question) {
  const { buffer } = await downloadFile(url);
  const csvContent = buffer.toString('utf-8');
  
  // Determine what operation is needed
  const questionLower = question.toLowerCase();
  
  let pythonCode;
  if (questionLower.includes('sum')) {
    // Find which column to sum
    const match = question.match(/sum\s+(?:of\s+)?(?:the\s+)?["']?(\w+)["']?/i);
    const column = match ? match[1] : null;
    
    pythonCode = `
result = df['${column}'].sum() if '${column}' in df.columns else df.select_dtypes(include=[np.number]).sum().sum()
print(result)
`;
  } else if (questionLower.includes('average') || questionLower.includes('mean')) {
    const match = question.match(/(?:average|mean)\s+(?:of\s+)?(?:the\s+)?["']?(\w+)["']?/i);
    const column = match ? match[1] : null;
    
    pythonCode = `
result = df['${column}'].mean() if '${column}' in df.columns else df.select_dtypes(include=[np.number]).mean().mean()
print(result)
`;
  } else if (questionLower.includes('count')) {
    pythonCode = `
result = len(df)
print(result)
`;
  } else if (questionLower.includes('max')) {
    const match = question.match(/max(?:imum)?\s+(?:of\s+)?(?:the\s+)?["']?(\w+)["']?/i);
    const column = match ? match[1] : null;
    
    pythonCode = `
result = df['${column}'].max() if '${column}' in df.columns else df.select_dtypes(include=[np.number]).max().max()
print(result)
`;
  } else if (questionLower.includes('min')) {
    const match = question.match(/min(?:imum)?\s+(?:of\s+)?(?:the\s+)?["']?(\w+)["']?/i);
    const column = match ? match[1] : null;
    
    pythonCode = `
result = df['${column}'].min() if '${column}' in df.columns else df.select_dtypes(include=[np.number]).min().min()
print(result)
`;
  } else {
    // Generic analysis with LLM
    const prompt = `Analyze this CSV data and answer:

Question: ${question}

CSV Data (first 50 rows):
${csvContent.split('\n').slice(0, 51).join('\n')}

Provide only the direct answer.`;

    const response = await analyzeWithFallback(prompt);
    return extractAnswer(response);
  }
  
  return await analyzeCSVWithPython(csvContent, pythonCode);
}

module.exports = {
  downloadFile,
  parsePDF,
  parseCSV,
  parseJSON,
  analyzeFileContent,
  processCSVFile
};
