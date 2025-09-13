// Simple test server for TranslatorJHU extension testing
import express from 'express';
import WebSocket from 'ws';
import cors from 'cors';

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Mock API endpoints for testing
app.get('/api/health', (req, res) => {
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

// Mock translation endpoint
app.post('/api/translate', (req, res) => {
  const { text, sourceLanguage, targetLanguage } = req.body;
  
  // Simple mock translation
  const translations = {
    'en-es': `[ES] ${text}`,
    'en-fr': `[FR] ${text}`,
    'en-de': `[DE] ${text}`,
    'en-zh': `[ZH] ${text}`,
    'es-en': `[EN] ${text}`,
    'fr-en': `[EN] ${text}`,
    'de-en': `[EN] ${text}`,
    'zh-en': `[EN] ${text}`
  };
  
  const key = `${sourceLanguage}-${targetLanguage}`;
  const translatedText = translations[key] || `[${targetLanguage.toUpperCase()}] ${text}`;
  
  res.json({
    success: true,
    translatedText,
    confidence: 0.9
  });
});

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server will start on ws://localhost:${PORT}`);
});

// WebSocket server
const { WebSocketServer } = WebSocket;
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('🔌 Client connected');
  
  ws.on('message', (data) => {
    try {
      if (data instanceof Buffer) {
        // Handle audio data
        console.log(`🎤 Received audio data: ${data.length} bytes`);
        
        // Simulate processing delay
        setTimeout(() => {
          // Send mock transcription
          ws.send(JSON.stringify({
            type: 'transcription',
            data: {
              id: Date.now().toString(),
              text: 'Hello, this is a test transcription',
              confidence: 0.9,
              timestamp: Date.now()
            }
          }));
          
          // Send mock translation
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'translation',
              data: {
                captionId: Date.now().toString(),
                translatedText: 'Hola, esta es una transcripción de prueba',
                confidence: 0.9,
                audioData: null // No audio for test
              }
            }));
          }, 500);
        }, 1000);
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
          ws.send(JSON.stringify({
            type: 'audio:stopped',
            data: { message: 'Audio recording stopped' }
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
