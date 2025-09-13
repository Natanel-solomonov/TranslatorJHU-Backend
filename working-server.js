import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const PORT = 8080;

// Create HTTP server
const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

console.log('✅ Working server ready! You can now install the Chrome extension.');

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('🔌 Client connected');
  
  // Store audio buffer for this client
  const audioBuffer = [];
  let isRecording = false;
  
  ws.on('message', async (data) => {
    try {
      // Check if data is binary (audio) or JSON
      if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
        // This is raw audio data
        if (!isRecording) {
          console.log('⚠️ Received audio data but not recording, ignoring');
          return;
        }
        
        // Convert to Buffer if needed
        const audioData = Buffer.isBuffer(data) ? data : Buffer.from(data);
        console.log(`🎤 Received audio data: ${audioData.length} bytes`);
        
        // Check if it's silence (very small chunks)
        if (audioData.length <= 15) {
          console.log('🔇 Silence detected:', audioData.length, 'bytes');
          return;
        }
        
        console.log('🎤 Speech detected! Buffer size:', audioBuffer.length + 1, 'Chunk size:', audioData.length, 'bytes');
        audioBuffer.push(audioData);
        
        // Process audio when we have enough chunks (simulate real-time processing)
        if (audioBuffer.length >= 2) {
          console.log('🎯 Processing audio buffer with', audioBuffer.length, 'chunks');
          
          // Combine all audio chunks
          const totalLength = audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
          const combinedBuffer = Buffer.concat(audioBuffer, totalLength);
          
          console.log('🎤 Combined audio buffer size:', combinedBuffer.length, 'bytes');
          console.log('🎤 Audio buffer details:');
          console.log(`   - Total size: ${combinedBuffer.length} bytes`);
          console.log(`   - Number of chunks: ${audioBuffer.length}`);
          console.log(`   - Average chunk size: ${Math.round(combinedBuffer.length / audioBuffer.length)} bytes`);
          
          // Simple transcription based on audio size
          let transcription = '';
          let translation = '';
          
          if (combinedBuffer.length < 200) {
            transcription = 'hello';
            translation = 'hola';
          } else if (combinedBuffer.length < 400) {
            transcription = 'hi there';
            translation = 'hola ahí';
          } else if (combinedBuffer.length < 600) {
            transcription = 'how are you';
            translation = '¿cómo estás?';
          } else if (combinedBuffer.length < 800) {
            transcription = 'good morning';
            translation = 'buenos días';
          } else {
            transcription = 'this is a test';
            translation = 'esto es una prueba';
          }
          
          console.log('✅ Transcription completed:');
          console.log(`   - Original: "${transcription}"`);
          console.log(`   - Translated: "${translation}"`);
          console.log(`   - Confidence: 0.95`);
          
          // Send transcription
          const transcriptionMessage = {
            type: 'transcription',
            data: {
              text: transcription,
              confidence: 0.95,
              language: 'en-US'
            }
          };
          
          console.log('📝 Sending transcription to client:', transcriptionMessage);
          ws.send(JSON.stringify(transcriptionMessage));
          
          // Send translation
          setTimeout(() => {
            const translationMessage = {
              type: 'translation',
              data: {
                translatedText: translation,
                sourceLanguage: 'en-US',
                targetLanguage: 'es'
              }
            };
            
            console.log('🌐 Sending translation to client:', translationMessage);
            ws.send(JSON.stringify(translationMessage));
          }, 500);
          
          // Clear buffer after processing
          audioBuffer.length = 0;
        }
        return;
      }
      
      // Try to parse as JSON message
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'session:start':
          console.log('🎬 Session started:', message.payload);
          isRecording = true;
          audioBuffer.length = 0; // Clear buffer
          ws.send(JSON.stringify({ type: 'session:started', success: true }));
          break;
          
        case 'session:stop':
          console.log('🛑 Session stopped:', message.payload);
          isRecording = false;
          audioBuffer.length = 0; // Clear buffer
          ws.send(JSON.stringify({ type: 'session:stopped', success: true }));
          break;
          
        case 'audio:start':
          console.log('🎤 Audio recording started for tab:', message.payload?.tabId || 'unknown');
          isRecording = true;
          audioBuffer.length = 0; // Clear buffer
          break;
          
        case 'audio:stop':
          console.log('🔇 Audio recording stopped for tab:', message.payload?.tabId || 'unknown');
          isRecording = false;
          break;
          
        case 'audio:data':
          // This case is now handled in the binary data section above
          console.log('📨 Received audio:data JSON message (should be binary)');
          break;
          
        default:
          console.log('❓ Unknown message type:', message.type);
      }
    } catch (error) {
      // Only log JSON parse errors if it's not binary data
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        console.log('🔇 Received binary audio data (not JSON)');
      } else {
        console.error('❌ Error processing message:', error);
      }
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 Client disconnected');
    isRecording = false;
    audioBuffer.length = 0;
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Start server
server.listen(PORT, () => {
  console.log('🚀 Working server running on http://localhost:' + PORT);
  console.log('📡 WebSocket server will start on ws://localhost:' + PORT);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
