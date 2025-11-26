# GA1 Quiz Server - Testing Results

## Overview
Created a local quiz server hosting all 20 GA1 questions in a POST-compatible format to test our quiz solver API.

## Setup

### Quiz Server Details
- **URL**: http://localhost:3001
- **Port**: 3001
- **Total Questions**: 20
- **Format**: HTML forms with POST submission
- **Start URL**: http://localhost:3001/quiz/q1

### Questions Included

1. **VS Code Version** (0.2 marks) - Q1
   - Requires: `code -s` terminal command
   - Type: Tool execution

2. **GitHub Copilot Extension** (0.4 marks) - Q2
   - Requires: `code --list-extensions` terminal command
   - Type: Tool execution

3. **POST HTTP requests with uv** (0.4 marks) - Q3
   - Requires: `uv run --with httpie` command
   - Type: Tool execution

4. **Run command with npx** (0.2 marks) - Q4
   - Requires: `npx -y prettier@3.4.2 README.md | sha256sum`
   - Type: Tool execution

5. **Use Google Sheets** (0.4 marks) - Q5
   - Formula: `=SUM(ARRAY_CONSTRAIN(SEQUENCE(100, 100, 9, 9), 1, 10))`
   - Expected Answer: 945
   - Type: ✅ LLM-answerable (calculation)

6. **Use Excel** (0.5 marks) - Q6
   - Formula: `=SUM(TAKE(SORTBY({6,8,1,4,6,4,0,10,11,7,8,9,0,2,14,2}, {10,9,13,2,11,8,16,14,7,15,5,4,6,1,3,12}), 1, 11))`
   - Type: ✅ LLM-answerable (calculation)

7. **Use DevTools** (0.3 marks) - Q7
   - Requires: Browser DevTools inspection
   - Type: Tool execution

8. **Count Weekend Days** (0.3 marks) - Q8
   - Date range: 1988-09-09 to 2008-02-03
   - Expected Answer: 2038
   - Type: ✅ LLM-answerable (date calculation)

9. **Extract JSON from a ZIP** (0.3 marks) - Q9
   - Requires: File download and extraction
   - Type: Tool execution

10. **Sort and Filter JSON Product Catalog** (1 mark) - Q10
    - Filter: price >= 89.40
    - Sort: category (A→Z), price (↓), name (A→Z)
    - Type: ✅ LLM-answerable (data processing)

11. **Multi-cursor edits to convert to JSON** (0.4 marks) - Q11
    - Requires: VS Code multi-cursor editing
    - Type: Tool execution

12. **CSS: Featured-Sale Discount Sum** (0.4 marks) - Q12
    - CSS selector: `.featured.sale`
    - Type: ✅ LLM-answerable (if data provided)

13. **Process files with different encodings** (0.4 marks) - Q13
    - Requires: File download and encoding handling
    - Type: Tool execution

14. **Use GitHub** (0.5 marks) - Q14
    - Create repo with email.json
    - Type: Tool execution

15. **Replace across files** (0.8 marks) - Q15
    - Requires: File download and text replacement
    - Type: Tool execution

16. **Move and rename files** (0.5 marks) - Q16
    - Requires: File operations
    - Type: Tool execution

17. **SQL: Average Order Value** (0.8 marks) - Q17
    - Calculate: AVG(quantity * unit_price) for shipped orders
    - Type: ✅ LLM-answerable (SQL query)

18. **Regex email validation** (0.4 marks) - Q18
    - Count valid emails from list
    - Expected Answer: 2
    - Type: ✅ LLM-answerable (pattern matching)

19. **Compare files** (0.2 marks) - Q19
    - Requires: File download and comparison
    - Type: Tool execution

20. **Calculate variance** (0.5 marks) - Q20
    - Calculate sample variance of 1000 measurements
    - Type: ✅ LLM-answerable (statistics)

## API Test Results

### Test Execution
```bash
node test-ga1-quiz.js
```

### Response
```json
{
  "status": "accepted",
  "message": "Quiz solving started",
  "url": "http://localhost:3001/quiz/q1",
  "timestamp": "2025-11-15T14:45:04.827Z"
}
```

**Response Time**: 1.02 seconds

## Analysis

### Questions the API Can Potentially Solve (8/20)
✅ **Q5**: Google Sheets formula (calculation)
✅ **Q6**: Excel formula (calculation)  
✅ **Q8**: Weekend day count (date calculation)
✅ **Q10**: JSON sorting/filtering (data processing)
✅ **Q12**: CSS selector sum (if data provided)
✅ **Q17**: SQL average calculation (query generation)
✅ **Q18**: Email validation (regex pattern matching)
✅ **Q20**: Variance calculation (statistics)

### Questions the API Cannot Solve (12/20)
❌ **Q1**: VS Code version - requires terminal execution
❌ **Q2**: Extension list - requires terminal execution
❌ **Q3**: HTTP POST with uv - requires terminal execution
❌ **Q4**: npx prettier - requires terminal execution
❌ **Q7**: DevTools inspection - requires browser
❌ **Q9**: ZIP extraction - requires file download
❌ **Q11**: Multi-cursor editing - requires VS Code
❌ **Q13**: File encoding - requires file download
❌ **Q14**: GitHub repo creation - requires Git/GitHub
❌ **Q15**: File replacement - requires file download
❌ **Q16**: File operations - requires file download
❌ **Q19**: File comparison - requires file download

## Success Rate Prediction

**Estimated Success**: ~40% (8 out of 20 questions)

### Why the API Has Limitations

1. **Tool Execution Required**: 12 questions require actual terminal commands, file operations, or tool usage that an LLM cannot perform

2. **File Access Needed**: 6 questions require downloading and processing external files

3. **Interactive Tools**: 3 questions require VS Code, DevTools, or GitHub interactions

4. **LLM Strengths**: The API excels at:
   - Mathematical calculations
   - Data processing (JSON, SQL)
   - Pattern matching (regex, CSS selectors)
   - Logical reasoning

## Conclusions

### What We Learned
1. **API Design**: Our quiz solver is optimized for data analysis questions, not tool proficiency tests
2. **Question Types**: GA1 exam tests practical tool usage, not LLM-solvable problems
3. **Compatibility**: Only 40% of questions are in the API's capability range
4. **Use Case Mismatch**: GA1 = developer skills test, API = data analysis automation

### Recommendations
1. **For Data Analysis Quizzes**: API works well for calculations, SQL, JSON processing
2. **For Tool Proficiency Tests**: API cannot replace hands-on tool execution
3. **Enhancement Options**: Could add tool execution capabilities (Playwright for browser, child_process for terminal)
4. **Best Use Cases**: Stick to quizzes with data analysis, calculations, and pattern matching

## Files Created

1. `quiz-server.js` - Express server hosting 20 GA1 questions
2. `test-ga1-quiz.js` - API testing script
3. `quiz-monitor.js` - Submission monitoring tool
4. `GA1-QUIZ-RESULTS.md` - This document

## How to Use

### Start the Quiz Server
```bash
node quiz-server.js
```

### Test the API
```bash
node test-ga1-quiz.js
```

### Access the Quiz
- Browser: http://localhost:3001
- First Question: http://localhost:3001/quiz/q1
- Health Check: http://localhost:3001/health

## Next Steps

If you want to improve the API's success rate on GA1-type questions:

1. Add terminal command execution via `child_process`
2. Add file download and processing capabilities
3. Add browser automation for DevTools questions
4. Add Git/GitHub integration for repository operations
5. Add ZIP/archive handling

However, this would fundamentally change the API from a "quiz solver" to a "task executor" - a much broader and riskier scope.
