// Simple test server for TranslatorJHU extension testing
import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { createServer } from 'http';
import AudioTranscriptionService from './src/services/audioTranscription.js';
import SimpleTranscriptionService from './src/services/simpleTranscription.js';

const app = express();
const PORT = 8080;

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

// Track audio processing state
let audioProcessingTimeout = null;
let lastAudioTime = 0;
let audioBuffer = [];
let transcriptionService = null;

// Initialize transcription service
try {
  transcriptionService = new AudioTranscriptionService();
  console.log('✅ Google Cloud transcription service initialized');
} catch (error) {
  console.warn('⚠️ Failed to initialize Google Cloud service, using simple transcription:', error.message);
  try {
    transcriptionService = new SimpleTranscriptionService();
    console.log('✅ Simple transcription service initialized');
  } catch (simpleError) {
    console.warn('⚠️ Failed to initialize simple transcription service, using mock mode:', simpleError.message);
  }
}

wss.on('connection', (ws) => {
  console.log('🔌 Client connected');
  
  ws.on('message', (data) => {
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
          
          // Process audio after 1.5 seconds of silence (faster response)
          audioProcessingTimeout = setTimeout(async () => {
            if (audioBuffer.length > 0) {
              console.log('🎯 Processing audio buffer with', audioBuffer.length, 'chunks');
              
              try {
                // Combine all audio chunks into a single buffer
                const totalLength = audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
                const combinedBuffer = Buffer.concat(audioBuffer, totalLength);
                
                console.log('🎤 Combined audio buffer size:', combinedBuffer.length, 'bytes');
                
                if (transcriptionService) {
                  // Use real transcription service
                  console.log('🔄 Using real transcription service...');
                  const result = await transcriptionService.processAudio(combinedBuffer, 'en-US', 'es');
                  
                  // Send real transcription
                  const transcriptionMessage = {
                    type: 'transcription',
                    data: result.transcription
                  };
                  
                  console.log('📝 Sending real transcription:', transcriptionMessage);
                  ws.send(JSON.stringify(transcriptionMessage));
                  
                  // Send real translation
                  setTimeout(() => {
                    const translationMessage = {
                      type: 'translation',
                      data: result.translation
                    };
                    
                    console.log('🌐 Sending real translation:', translationMessage);
                    ws.send(JSON.stringify(translationMessage));
                  }, 500);
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
          }, 1500); // Reduced from 2000ms to 1500ms
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
