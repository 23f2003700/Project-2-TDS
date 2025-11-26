/**
 * Monitor quiz submissions and track API performance
 */

const express = require('express');
const app = express();
const PORT = 3002;

app.use(express.json());

// Store submission history
const submissions = [];

// Proxy endpoint to monitor submissions
app.post('/monitor', (req, res) => {
  const submission = {
    timestamp: new Date().toISOString(),
    ...req.body
  };
  
  submissions.push(submission);
  
  console.log(`\n📥 New Submission:`);
  console.log(`Quiz: ${submission.quiz_id}`);
  console.log(`Answer: ${submission.answer?.substring(0, 100)}...`);
  
  res.json({ received: true });
});

app.get('/report', (req, res) => {
  const report = {
    totalSubmissions: submissions.length,
    submissions: submissions.map(s => ({
      time: s.timestamp,
      quiz: s.quiz_id,
      answerPreview: s.answer?.substring(0, 50)
    }))
  };
  
  res.json(report);
});

app.listen(PORT, () => {
  console.log(`\n📊 Monitor running on http://localhost:${PORT}`);
  console.log(`📈 View report: http://localhost:${PORT}/report`);
});
