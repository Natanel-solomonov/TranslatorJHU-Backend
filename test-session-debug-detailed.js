const WebSocket = require('ws');

console.log('🔌 Connecting to WebSocket server...');

const ws = new WebSocket('ws://localhost:3001/ws');

let messageCount = 0;

ws.on('open', function open() {
  console.log('✅ Connected to server!');
  messageCount++;
  
  // Send session start message immediately
  const sessionMessage = {
    type: 'session:start',
    data: {
      sessionId: 'debug-detailed-' + Date.now(),
      sourceLanguage: 'en',
      targetLanguage: 'es'
    },
    timestamp: Date.now()
  };
  
  console.log('📤 Sending session start message...');
  console.log('Message content:', JSON.stringify(sessionMessage, null, 2));
  ws.send(JSON.stringify(sessionMessage));
  
  // Send another message after 2 seconds to test if the connection is still alive
  setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
      console.log('📤 Sending ping message...');
      ws.send(JSON.stringify({
        type: 'ping',
        data: { message: 'test ping' },
        timestamp: Date.now()
      }));
    } else {
      console.log('❌ Connection closed before ping');
    }
  }, 2000);
});

ws.on('message', function message(data) {
  messageCount++;
  console.log(`\n📥 Message #${messageCount}:`);
  
  try {
    const parsed = JSON.parse(data);
    console.log('  Type:', parsed.type);
    console.log('  Data:', JSON.stringify(parsed.data, null, 2));
    console.log('  Timestamp:', new Date(parsed.timestamp || Date.now()).toISOString());
    
    if (parsed.type === 'session:started') {
      console.log('🎉 SUCCESS: Session started successfully!');
      
      // Test audio start
      setTimeout(() => {
        console.log('📤 Testing audio start...');
        ws.send(JSON.stringify({
          type: 'audio:start',
          data: { tabId: 123 },
          timestamp: Date.now()
        }));
      }, 1000);
    }
    
    if (parsed.type === 'audio:started') {
      console.log('🎉 SUCCESS: Audio started successfully!');
      
      // Test audio data
      setTimeout(() => {
        console.log('📤 Sending mock audio data...');
        const mockAudio = Buffer.from('mock audio data for testing transcription');
        ws.send(mockAudio);
      }, 1000);
    }
    
    if (parsed.type === 'transcription') {
      console.log('🎉 SUCCESS: Received transcription:', parsed.data.text);
    }
    
    if (parsed.type === 'translation') {
      console.log('🎉 SUCCESS: Received translation:', parsed.data.text);
    }
    
    if (parsed.type === 'error') {
      console.log('❌ ERROR:', parsed.data.message);
    }
    
  } catch (e) {
    console.log('  Binary data:', data.length, 'bytes');
  }
});

ws.on('ping', function() {
  console.log('📡 Received ping');
});

ws.on('pong', function() {
  console.log('📡 Received pong');
});

ws.on('error', function error(err) {
  console.log('❌ WebSocket error:', err.message);
});

ws.on('close', function close(code, reason) {
  console.log('🔌 Connection closed (code:', code, ')');
  if (reason) console.log('Reason:', reason.toString());
  console.log(`Total messages received: ${messageCount - 1}`);
});

// Close after 15 seconds
setTimeout(() => {
  console.log('\n🔚 Closing connection after 15 seconds...');
  ws.close();
}, 15000);




