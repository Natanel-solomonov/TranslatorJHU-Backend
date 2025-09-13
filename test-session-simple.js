const WebSocket = require('ws');

console.log('🔌 Connecting to WebSocket server...');

const ws = new WebSocket('ws://localhost:3001/ws');

ws.on('open', function open() {
  console.log('✅ Connected to server!');
  
  // Send session start message immediately
  const sessionMessage = {
    type: 'session:start',
    data: {
      sessionId: 'simple-test-' + Date.now(),
      sourceLanguage: 'en',
      targetLanguage: 'es'
    },
    timestamp: Date.now()
  };
  
  console.log('📤 Sending session start:', JSON.stringify(sessionMessage, null, 2));
  ws.send(JSON.stringify(sessionMessage));
});

ws.on('message', function message(data) {
  console.log('\n📥 Received message:');
  try {
    const parsed = JSON.parse(data);
    console.log('  Type:', parsed.type);
    console.log('  Data:', JSON.stringify(parsed.data, null, 2));
    
    if (parsed.type === 'session:started') {
      console.log('🎉 SUCCESS: Session started!');
      
      // Test audio start
      setTimeout(() => {
        const audioMessage = {
          type: 'audio:start',
          data: { tabId: 123 },
          timestamp: Date.now()
        };
        console.log('\n📤 Sending audio start:', JSON.stringify(audioMessage, null, 2));
        ws.send(JSON.stringify(audioMessage));
      }, 1000);
    }
    
    if (parsed.type === 'audio:started') {
      console.log('🎉 SUCCESS: Audio started!');
      
      // Test audio data
      setTimeout(() => {
        const audioData = Buffer.from('mock audio data for testing');
        console.log('\n📤 Sending mock audio data...');
        ws.send(audioData);
      }, 1000);
    }
    
    if (parsed.type === 'transcription') {
      console.log('🎉 SUCCESS: Received transcription:', parsed.data.text);
    }
    
    if (parsed.type === 'translation') {
      console.log('🎉 SUCCESS: Received translation:', parsed.data.text);
    }
    
  } catch (e) {
    console.log('  Binary data:', data.length, 'bytes');
  }
});

ws.on('error', function error(err) {
  console.log('❌ WebSocket error:', err.message);
});

ws.on('close', function close(code, reason) {
  console.log('🔌 Connection closed (code:', code, ')');
  if (reason) console.log('Reason:', reason.toString());
});

// Close after 10 seconds
setTimeout(() => {
  console.log('\n🔚 Closing connection...');
  ws.close();
}, 10000);




