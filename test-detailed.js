const WebSocket = require("ws");

// Detailed test to debug WebSocket message flow
const ws = new WebSocket("ws://localhost:3001/ws");

let testResults = [];

ws.on("open", function open() {
  console.log("✅ WebSocket connected successfully!");

  // Wait a bit for connection to stabilize
  setTimeout(() => {
    console.log("🔗 Testing session start...");

    const sessionMessage = {
      type: "session:start",
      data: {
        sessionId: "test-session-detailed",
        sourceLanguage: "en",
        targetLanguage: "es",
      },
      timestamp: Date.now(),
    };

    console.log(
      "📤 Sending session start message:",
      JSON.stringify(sessionMessage, null, 2)
    );
    ws.send(JSON.stringify(sessionMessage));
  }, 1000);
});

ws.on("message", function message(data) {
  try {
    const parsed = JSON.parse(data);
    testResults.push(parsed);

    console.log("\n📥 Received message:");
    console.log("  Type:", parsed.type);
    console.log("  Data:", JSON.stringify(parsed.data, null, 2));
    console.log(
      "  Timestamp:",
      new Date(parsed.timestamp || Date.now()).toISOString()
    );

    // If we get session:started, test audio start
    if (parsed.type === "session:started") {
      console.log("\n✅ Session started successfully!");
      setTimeout(() => {
        const audioMessage = {
          type: "audio:start",
          data: { tabId: 123 },
          timestamp: Date.now(),
        };

        console.log(
          "\n📤 Sending audio start message:",
          JSON.stringify(audioMessage, null, 2)
        );
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
  console.error("Error details:", err);
});

ws.on("close", function close(code, reason) {
  console.log("\n🔌 Connection closed");
  console.log("Close code:", code);
  console.log("Close reason:", reason?.toString());

  console.log("\n📊 Test Summary:");
  testResults.forEach((msg, i) => {
    console.log(`${i + 1}. ${msg.type} - ${JSON.stringify(msg.data)}`);
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
}, 15000);





