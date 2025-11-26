/**
 * Code Execution Service
 * Safely executes Python code for complex calculations
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const logger = require('../utils/logger');

const PYTHON_TIMEOUT = 30000; // 30 seconds

/**
 * Execute Python code and return the output
 */
async function executePython(code) {
  const tempDir = os.tmpdir();
  const scriptPath = path.join(tempDir, `quiz_solver_${Date.now()}.py`);
  
  try {
    // Add common imports and output handling
    const fullCode = `
import sys
import json
import math
from datetime import datetime, timedelta, date

try:
    import pandas as pd
    import numpy as np
except ImportError:
    pass

# User code
${code}
`;
    
    await fs.writeFile(scriptPath, fullCode, 'utf-8');
    logger.debug('Executing Python code:', code.substring(0, 200));
    
    return new Promise((resolve, reject) => {
      const python = spawn('python', [scriptPath], {
        timeout: PYTHON_TIMEOUT,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });
      
      let stdout = '';
      let stderr = '';
      
      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      python.on('close', async (code) => {
        // Cleanup
        try {
          await fs.unlink(scriptPath);
        } catch (e) {
          // Ignore cleanup errors
        }
        
        if (code === 0) {
          logger.debug('Python output:', stdout.trim());
          resolve(stdout.trim());
        } else {
          logger.error('Python error:', stderr);
          reject(new Error(`Python execution failed: ${stderr}`));
        }
      });
      
      python.on('error', (err) => {
        logger.error('Python spawn error:', err);
        reject(err);
      });
    });
  } catch (error) {
    logger.error('Python execution setup failed:', error);
    throw error;
  }
}

/**
 * Execute a calculation using Python for precision
 */
async function calculateWithPython(expression) {
  const code = `
result = ${expression}
print(result)
`;
  return executePython(code);
}

/**
 * Analyze CSV data with Python/Pandas
 */
async function analyzeCSVWithPython(csvContent, analysis) {
  const code = `
import pandas as pd
import io

csv_data = """${csvContent.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"""
df = pd.read_csv(io.StringIO(csv_data))

# Analysis
${analysis}
`;
  return executePython(code);
}

/**
 * Calculate statistical measures
 */
async function calculateStatistics(data, measures) {
  const code = `
import numpy as np
from scipy import stats

data = ${JSON.stringify(data)}

results = {}
${measures.includes('mean') ? "results['mean'] = float(np.mean(data))" : ''}
${measures.includes('median') ? "results['median'] = float(np.median(data))" : ''}
${measures.includes('std') ? "results['std'] = float(np.std(data))" : ''}
${measures.includes('variance') ? "results['variance'] = float(np.var(data, ddof=1))" : ''}
${measures.includes('min') ? "results['min'] = float(np.min(data))" : ''}
${measures.includes('max') ? "results['max'] = float(np.max(data))" : ''}
${measures.includes('sum') ? "results['sum'] = float(np.sum(data))" : ''}
${measures.includes('count') ? "results['count'] = len(data)" : ''}

import json
print(json.dumps(results))
`;
  
  const result = await executePython(code);
  return JSON.parse(result);
}

/**
 * Count weekend days between two dates
 */
async function countWeekendDays(startDate, endDate) {
  const code = `
from datetime import datetime, timedelta

start = datetime.strptime("${startDate}", "%Y-%m-%d")
end = datetime.strptime("${endDate}", "%Y-%m-%d")

count = 0
current = start
while current <= end:
    if current.weekday() >= 5:  # Saturday = 5, Sunday = 6
        count += 1
    current += timedelta(days=1)

print(count)
`;
  return parseInt(await executePython(code), 10);
}

/**
 * Sort and filter JSON data
 */
async function processJSONData(jsonData, operations) {
  const code = `
import json

data = ${JSON.stringify(jsonData)}

${operations}

print(json.dumps(result, separators=(',', ':')))
`;
  
  const result = await executePython(code);
  return JSON.parse(result);
}

module.exports = {
  executePython,
  calculateWithPython,
  analyzeCSVWithPython,
  calculateStatistics,
  countWeekendDays,
  processJSONData
};
