const WebSocket = require("ws");

// Final test of WebSocket connection with all services configured
const ws = new WebSocket("ws://localhost:3001/ws");

let testResults = [];

ws.on("open", function open() {
  console.log("✅ WebSocket connected successfully!");
  console.log("🔗 Testing complete translation pipeline...");

  // Test session start
  const sessionMessage = {
    type: "session:start",
    data: {
      sessionId: "test-session-final",
      sourceLanguage: "en",
      targetLanguage: "es",
    },
    timestamp: Date.now(),
  };

  console.log("\n📤 Sending session start message...");
  ws.send(JSON.stringify(sessionMessage));
});

ws.on("message", function message(data) {
  try {
    const parsed = JSON.parse(data);
    testResults.push(parsed);

    console.log("\n📥 Received:", parsed.type);
    if (parsed.data) {
      console.log("Data:", JSON.stringify(parsed.data, null, 2));
    }

    // Test audio start after session is confirmed
    if (parsed.type === "session:started") {
      console.log("\n✅ Session started successfully!");
      setTimeout(() => {
        const audioMessage = {
          type: "audio:start",
          data: { tabId: 123 },
          timestamp: Date.now(),
        };

        console.log("\n📤 Sending audio start message...");
        ws.send(JSON.stringify(audioMessage));
      }, 1000);
    }

    if (parsed.type === "audio:started") {
      console.log("\n✅ Audio recording started successfully!");
      console.log("\n🎉 All services are working correctly!");
    }
  } catch (e) {
    console.log("📥 Received binary data:", data.length, "bytes");
  }
});

ws.on("error", function error(err) {
  console.error("\n❌ WebSocket error:", err.message);
});

ws.on("close", function close() {
  console.log("\n🔌 Connection closed");
  console.log("\n📊 Test Summary:");
  testResults.forEach((msg, i) => {
    console.log(
      `${i + 1}. ${msg.type} - ${
        msg.data ? JSON.stringify(msg.data) : "No data"
      }`
    );
  });

  // Check if all expected messages were received
  const expectedMessages = ["connected", "session:started", "audio:started"];
  const receivedTypes = testResults.map((r) => r.type);
  const missing = expectedMessages.filter(
    (expected) => !receivedTypes.includes(expected)
  );

  if (missing.length === 0) {
    console.log("\n🎉 SUCCESS: All translation services are working!");
  } else {
    console.log("\n⚠️  Missing responses:", missing);
  }
});

// Keep connection open for testing
setTimeout(() => {
  console.log("\n🔚 Closing connection...");
  ws.close();
}, 10000);





