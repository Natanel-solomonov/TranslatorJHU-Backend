// Simple test server for TranslatorJHU extension testing
import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { createServer } from 'http';
import AudioTranscriptionService from './src/services/audioTranscription.js';
import SimpleTranscriptionService from './src/services/simpleTranscription.js';
import { elevenLabsService } from './src/services/elevenLabsService.js';
import { elevenLabsSTTService } from './src/services/elevenLabsSTT.js';
import { assemblyAIService } from './src/services/assemblyAIService.js';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Mock API endpoints for testing
app.get('/api/health', (req, res) => {
  console.log('Health check requested');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    services: {
      stt: 'available',
      translation: 'available',
      tts: 'available'
    }
  });
});

// Translation endpoint for text translation
app.post('/api/translate', async (req, res) => {
  try {
    const { text, sourceLanguage = 'en', targetLanguage = 'es' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log(`🌐 Translation request: "${text}" (${sourceLanguage} → ${targetLanguage})`);
    
    // Use the transcription service for translation
    const result = await transcriptionService.translateText(text, targetLanguage);
    
    console.log(`✅ Translation result: "${result.translatedText}"`);
    
    res.json({
      translatedText: result.translatedText,
      confidence: result.confidence || 0.8,
      sourceLanguage,
      targetLanguage
    });
  } catch (error) {
    console.error('❌ Translation endpoint error:', error);
    res.status(500).json({ 
      error: 'Translation failed',
      message: error.message 
    });
  }
});

// Caption text processing endpoint (for Google Meet captions)
app.post('/api/caption-text', async (req, res) => {
  try {
    const { text, language = 'en', targetLanguage = 'es' } = req.body;
    
    console.log(`\n🎯 CAPTION TRANSLATION REQUEST:`);
    console.log(`📝 Original text: "${text}"`);
    console.log(`🌍 Language: ${language} → ${targetLanguage}`);
    
    if (!text || text.trim() === '') {
      console.log('❌ Empty text provided');
      return res.status(400).json({ error: 'Text is required' });
    }

    // Use the transcription service for translation
    console.log(`🔄 Processing translation...`);
    const result = await transcriptionService.translateText(text, targetLanguage);
    
    console.log(`✅ Translation completed:`);
    console.log(`   📝 Original: "${result.originalText || text}"`);
    console.log(`   🌍 Translated: "${result.translatedText}"`);
    console.log(`   📊 Confidence: ${result.confidence || 0.8}`);
    console.log(`   🔊 Audio data: ${result.audioData ? `${result.audioData.length} bytes` : 'null'}`);
    
    res.json({
      originalText: text,
      translatedText: result.translatedText,
      confidence: result.confidence || 0.8,
      audioData: result.audioData || null
    });
  } catch (error) {
    console.error('❌ Caption translation error:', error);
    res.status(500).json({ error: 'Caption translation failed' });
  }
});

// ElevenLabs voice synthesis endpoint
app.post('/api/synthesize', async (req, res) => {
  try {
    const { text, voiceId = '21m00Tcm4TlvDq8ikWAM' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log(`🎤 ElevenLabs synthesis request: "${text}" with voice ${voiceId}`);
    
    const result = await elevenLabsService.synthesizeSpeech(text, voiceId);
    
    console.log(`✅ ElevenLabs synthesis completed: ${result.audioBuffer.byteLength} bytes`);
    
    res.json({
      audioBuffer: Array.from(new Uint8Array(result.audioBuffer)),
      format: result.format,
      duration: result.duration,
      provider: result.provider
    });
  } catch (error) {
    console.error('❌ ElevenLabs synthesis error:', error);
    res.status(500).json({ 
      error: 'Voice synthesis failed',
      message: error.message 
    });
  }
});

// AssemblyAI transcription endpoint
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioBuffer, language = 'en_us' } = req.body;
    
    if (!audioBuffer) {
      return res.status(400).json({ error: 'Audio buffer is required' });
    }

    console.log(`🎤 AssemblyAI transcription request: ${audioBuffer.length} bytes`);
    
    const audioArrayBuffer = new Uint8Array(audioBuffer).buffer;
    const result = await assemblyAIService.transcribeAudio(audioArrayBuffer, language);
    
    console.log(`✅ AssemblyAI transcription completed: "${result.text}"`);
    
    res.json({
      text: result.text,
      confidence: result.confidence,
      isFinal: result.isFinal,
      provider: result.provider
    });
  } catch (error) {
    console.error('❌ AssemblyAI transcription error:', error);
    res.status(500).json({ 
      error: 'Transcription failed',
      message: error.message 
    });
  }
});

// Get available voices
app.get('/api/voices', async (req, res) => {
  try {
    const voices = await elevenLabsService.getVoices();
    res.json({ voices });
  } catch (error) {
    console.error('❌ Failed to get voices:', error);
    res.status(500).json({ error: 'Failed to get voices' });
  }
});

// Get API usage
app.get('/api/usage', async (req, res) => {
  try {
    const [elevenLabsUsage, assemblyAIUsage] = await Promise.all([
      elevenLabsService.getUsage(),
      assemblyAIService.getUsage()
    ]);
    
    res.json({
      elevenlabs: elevenLabsUsage,
      assemblyai: assemblyAIUsage
    });
  } catch (error) {
    console.error('❌ Failed to get usage:', error);
    res.status(500).json({ error: 'Failed to get usage' });
  }
});

app.get('/api/config', (req, res) => {
  console.log('Config requested');
  res.json({
    languages: {
      supported: [
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'es', name: 'Spanish', nativeName: 'Español' },
        { code: 'fr', name: 'French', nativeName: 'Français' },
        { code: 'de', name: 'German', nativeName: 'Deutsch' },
        { code: 'zh', name: 'Chinese', nativeName: '中文' }
      ]
    },
    tts: {
      provider: 'test',
      voices: [
        { id: 'test-voice', name: 'Test Voice', gender: 'female', language: 'en' }
      ]
    },
    features: {
      realTimeTranslation: true,
      voiceActivityDetection: true,
      naturalVoices: true,
      multipleLanguages: true
    }
  });
});

// Start HTTP server
const server = createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server will start on ws://localhost:${PORT}`);
});

// WebSocket server
const wss = new WebSocketServer({ server });

// Handle WebSocket server errors
wss.on('error', (error) => {
  console.error('❌ WebSocket server error:', error);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error('❌ Port 8080 is already in use. Please kill the existing process or use a different port.');
  } else {
    console.error('❌ Server error:', error);
  }
});

// Track audio processing state
let audioProcessingTimeout = null;
let lastAudioTime = 0;
let audioBuffer = [];
let transcriptionService = null;

// Initialize transcription service - use ElevenLabs for TTS, mock for STT
console.log('🎤 Initializing ElevenLabs + Mock STT service...');
transcriptionService = elevenLabsSTTService;
console.log('✅ ElevenLabs + Mock STT service initialized');

wss.on('connection', (ws) => {
  console.log('🔌 Client connected');
  
  // Handle WebSocket connection errors
  ws.on('error', (error) => {
    console.error('❌ WebSocket connection error:', error);
  });
  
  ws.on('close', () => {
    console.log('🔌 Client disconnected');
  });
  
  ws.on('message', async (data) => {
    try {
      if (data instanceof Buffer) {
        // Handle audio data
        console.log(`🎤 Received audio data: ${data.length} bytes`);
        
        // Only process audio chunks larger than 15 bytes (actual speech)
        if (data.length > 15) {
          lastAudioTime = Date.now();
          audioBuffer.push(data);
          
          console.log(`🎤 Speech detected! Buffer size: ${audioBuffer.length}, Chunk size: ${data.length} bytes`);
          
          // Clear existing timeout
          if (audioProcessingTimeout) {
            clearTimeout(audioProcessingTimeout);
          }
          
          // Process audio after 2 seconds of silence (allow longer recording)
          audioProcessingTimeout = setTimeout(async () => {
            if (audioBuffer.length > 0) {
              console.log('🎯 Processing audio buffer with', audioBuffer.length, 'chunks');
              
              try {
                // Combine all audio chunks into a single buffer
                const totalLength = audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
                const combinedBuffer = Buffer.concat(audioBuffer, totalLength);
                
                console.log('🎤 Combined audio buffer size:', combinedBuffer.length, 'bytes');
                
                // Check minimum audio length (at least 0.5 seconds)
                const minAudioLength = 8000; // ~0.5 seconds at 16kHz
                if (combinedBuffer.length < minAudioLength) {
                  console.log(`⚠️ Audio too short for processing: ${combinedBuffer.length} bytes (minimum: ${minAudioLength} bytes)`);
                  audioBuffer = []; // Clear buffer
                  return;
                }
                
                if (transcriptionService) {
                  // Use ElevenLabs STT service
                  console.log('🔄 Using ElevenLabs STT service...');
                  console.log('🎤 Audio buffer details:');
                  console.log(`   - Total size: ${combinedBuffer.length} bytes`);
                  console.log(`   - Number of chunks: ${audioBuffer.length}`);
                  console.log(`   - Average chunk size: ${Math.round(combinedBuffer.length / audioBuffer.length)} bytes`);
                  
                  try {
                    // Transcribe using ElevenLabs STT
                    const transcriptionResult = await transcriptionService.transcribeAudio(combinedBuffer, 'en');
                    
                    console.log('✅ ElevenLabs STT completed:');
                    console.log(`   - Text: "${transcriptionResult.text}"`);
                    console.log(`   - Confidence: ${transcriptionResult.confidence}`);
                    console.log(`   - Provider: ${transcriptionResult.provider}`);
                    
                    // Translate the transcribed text
                    const translationResult = await transcriptionService.translateText(transcriptionResult.text, 'es');
                    
                    console.log('✅ Translation completed:');
                    console.log(`   - Original: "${transcriptionResult.text}"`);
                    console.log(`   - Translated: "${translationResult.translatedText}"`);
                    console.log(`   - Confidence: ${translationResult.confidence}`);
                    
                    // Send real transcription
                    const transcriptionMessage = {
                      type: 'transcription',
                      data: {
                        id: Date.now().toString(),
                      text: transcriptionResult.text,
                      confidence: transcriptionResult.confidence,
                      timestamp: Date.now(),
                      isFinal: true
                    }
                  };
                  
                  console.log('📝 Sending transcription to client:', transcriptionMessage);
                  ws.send(JSON.stringify(transcriptionMessage));
                  
                  // Send real translation
                  setTimeout(() => {
                    const translationMessage = {
                      type: 'translation',
                      data: {
                        captionId: transcriptionMessage.data.id,
                        translatedText: translationResult.translatedText,
                        confidence: translationResult.confidence,
                        audioData: null
                      }
                    };
                    
                    console.log('🌐 Sending translation to client:', translationMessage);
                    ws.send(JSON.stringify(translationMessage));
                  }, 500);
                  
                  } catch (error) {
                    console.error('❌ Transcription/Translation error:', error);
                    
                    // Send error message to client
                    const errorMessage = {
                      type: 'error',
                      data: {
                        message: `Transcription failed: ${error.message}`,
                        timestamp: Date.now()
                      }
                    };
                    
                    console.log('📝 Sending error to client:', errorMessage);
                    ws.send(JSON.stringify(errorMessage));
                  }
                } else {
                  // Fallback to mock transcription
                  console.log('🔄 Using mock transcription (service not available)...');
                  const transcriptionMessage = {
                    type: 'transcription',
                    data: {
                      id: Date.now().toString(),
                      text: 'Hello, this is a test transcription from your microphone',
                      confidence: 0.9,
                      timestamp: Date.now()
                    }
                  };
                  
                  console.log('📝 Sending mock transcription:', transcriptionMessage);
                  ws.send(JSON.stringify(transcriptionMessage));
                  
                  // Send mock translation
                  setTimeout(() => {
                    const translationMessage = {
                      type: 'translation',
                      data: {
                        captionId: Date.now().toString(),
                        translatedText: 'Hola, esta es una transcripción de prueba de tu micrófono',
                        confidence: 0.9,
                        audioData: null
                      }
                    };
                    
                    console.log('🌐 Sending mock translation:', translationMessage);
                    ws.send(JSON.stringify(translationMessage));
                  }, 500);
                }
              } catch (error) {
                console.error('❌ Error processing audio:', error);
                
                // Send error transcription
                const errorMessage = {
                  type: 'transcription',
                  data: {
                    id: Date.now().toString(),
                    text: 'Error processing audio: ' + error.message,
                    confidence: 0.1,
                    timestamp: Date.now()
                  }
                };
                
                ws.send(JSON.stringify(errorMessage));
              }
              
              // Clear buffer
              audioBuffer = [];
            }
          }, 2000); // Increased to 2000ms for better audio capture
        } else {
          console.log(`🔇 Silence detected: ${data.length} bytes`);
        }
      } else {
        // Handle JSON messages
        const message = JSON.parse(data.toString());
        console.log('📨 Received message:', message.type);
        
        // Echo back session messages
        if (message.type === 'session:start') {
          ws.send(JSON.stringify({
            type: 'session:started',
            data: {
              sessionId: message.data.sessionId || 'test-session',
              sourceLanguage: message.data.sourceLanguage || 'en',
              targetLanguage: message.data.targetLanguage || 'es'
            }
          }));
        } else if (message.type === 'audio:start') {
          ws.send(JSON.stringify({
            type: 'audio:started',
            data: { message: 'Audio recording started' }
          }));
        } else if (message.type === 'audio:stop') {
          // Clear any pending audio processing
          if (audioProcessingTimeout) {
            clearTimeout(audioProcessingTimeout);
            audioProcessingTimeout = null;
          }
          audioBuffer = [];
          
          ws.send(JSON.stringify({
            type: 'audio:stopped',
            data: { message: 'Audio recording stopped' }
          }));
        } else if (message.type === 'session:stop') {
          // Clear any pending audio processing
          if (audioProcessingTimeout) {
            clearTimeout(audioProcessingTimeout);
            audioProcessingTimeout = null;
          }
          audioBuffer = [];
          
          ws.send(JSON.stringify({
            type: 'session:stopped',
            data: { message: 'Session stopped' }
          }));
        } else if (message.type === 'caption_text') {
          // Handle Google Meet caption text
          console.log('📝 Processing caption text:', message.data.text);
          
          try {
            const { text, language = 'en', targetLanguage = 'es' } = message.data;
            
            if (!text || text.trim() === '') {
              console.log('⚠️ Empty caption text, skipping');
              return;
            }
            
            // Translate the caption text
            const translationResult = await transcriptionService.translateText(text, targetLanguage);
            
            console.log('✅ Caption translation completed:');
            console.log(`   - Original: "${text}"`);
            console.log(`   - Translated: "${translationResult.translatedText}"`);
            console.log(`   - Confidence: ${translationResult.confidence}`);
            
            // Send translation back to client
            const translationMessage = {
              type: 'translation',
              data: {
                originalText: text,
                translatedText: translationResult.translatedText,
                confidence: translationResult.confidence,
                audioData: translationResult.audioData,
                timestamp: Date.now()
              }
            };
            
            console.log('📤 Sending caption translation to client:', translationMessage);
            ws.send(JSON.stringify(translationMessage));
            
          } catch (error) {
            console.error('❌ Caption translation error:', error);
            
            // Send error message to client
            const errorMessage = {
              type: 'error',
              data: {
                message: `Caption translation failed: ${error.message}`,
                timestamp: Date.now()
              }
            };
            
            console.log('📝 Sending error to client:', errorMessage);
            ws.send(JSON.stringify(errorMessage));
          }
        }
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 Client disconnected');
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    data: {
      clientId: 'test-client',
      message: 'Connected to TranslatorJHU test server'
    }
  }));
});

console.log('✅ Test server ready! You can now install the Chrome extension.');
