/**
 * Audio Question Processor
 * Handles audio transcription using Groq Whisper
 */

const axios = require('axios');
const groq = require('../services/groq');
const logger = require('../utils/logger');

async function processAudioQuestion(audioUrl, questionText) {
  try {
    logger.info('Processing audio question:', audioUrl);

    // Download audio file
    const response = await axios.get(audioUrl, {
      responseType: 'arraybuffer',
      timeout: 60000 // Audio files may be larger
    });

    // Transcribe with Whisper
    const transcription = await groq.transcribeAudio(response.data);
    
    logger.info('Audio transcription:', transcription);

    // If there's a specific question, analyze the transcription
    if (questionText && questionText.length > 10) {
      const prompt = `Based on this audio transcription, answer the question.

Transcription: ${transcription}

Question: ${questionText}

Provide a direct, concise answer:`;

      const answer = await groq.analyzeText(prompt);
      return answer.trim();
    }

    return transcription;
  } catch (error) {
    logger.error('Audio question processing failed:', error);
    throw error;
  }
}

async function extractAudioFromPage(page) {
  try {
    // Get audio element or link from the page
    const audioUrl = await page.evaluate(() => {
      // Check for audio element
      const audio = document.querySelector('audio');
      if (audio && audio.src) {
        return audio.src;
      }

      // Check for links to audio files
      const links = document.querySelectorAll('a');
      for (let link of links) {
        const href = link.href.toLowerCase();
        if (href.endsWith('.mp3') || href.endsWith('.wav') || href.endsWith('.m4a')) {
          return link.href;
        }
      }

      return null;
    });

    return audioUrl;
  } catch (error) {
    logger.error('Failed to extract audio from page:', error);
    return null;
  }
}

module.exports = {
  processAudioQuestion,
  extractAudioFromPage
};
