/**
 * Groq LLM Client
 * Uses Groq SDK for text analysis and audio transcription
 */

const Groq = require('groq-sdk');
const logger = require('../utils/logger');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const TEXT_MODEL = 'llama-3.3-70b-versatile';
const AUDIO_MODEL = 'whisper-large-v3-turbo';

async function analyzeText(prompt, systemPrompt = null) {
  try {
    logger.debug('Analyzing text with Groq LLM');
    
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const completion = await groq.chat.completions.create({
      model: TEXT_MODEL,
      messages: messages,
      temperature: 0.1,
      max_tokens: 2000
    });

    const response = completion.choices[0]?.message?.content || '';
    logger.debug('Groq response received');
    return response;
  } catch (error) {
    logger.error('Groq text analysis failed:', error);
    throw error;
  }
}

async function analyzeImage(base64Image, question) {
  try {
    logger.debug('Analyzing image with Groq vision');
    
    const prompt = `Question: ${question}\n\nAnalyze this image and provide a direct answer. Be concise and specific.`;

    const completion = await groq.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { 
              type: 'image_url',
              image_url: { url: base64Image }
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 1000
    });

    const response = completion.choices[0]?.message?.content || '';
    logger.debug('Groq image analysis complete');
    return response;
  } catch (error) {
    logger.error('Groq image analysis failed:', error);
    throw error;
  }
}

async function transcribeAudio(audioBuffer) {
  try {
    logger.debug('Transcribing audio with Whisper');
    
    // Create a File-like object from buffer
    const audioFile = new File([audioBuffer], 'audio.mp3', { type: 'audio/mpeg' });
    
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: AUDIO_MODEL,
      response_format: 'json'
    });

    logger.debug('Audio transcription complete');
    return transcription.text;
  } catch (error) {
    logger.error('Audio transcription failed:', error);
    throw error;
  }
}

module.exports = {
  analyzeText,
  analyzeImage,
  transcribeAudio
};
