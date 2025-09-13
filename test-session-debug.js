const WebSocket = require("ws");

// Debug test for session start issues
const ws = new WebSocket("ws://localhost:3001/ws");

let messageCount = 0;

ws.on("open", function open() {
  console.log("✅ WebSocket connected!");
  messageCount++;

  // Keep connection alive with ping
  const keepAlive = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(keepAlive);
    }
  }, 5000);

  // Send session start after a short delay
  setTimeout(() => {
    console.log("📤 Sending session start message...");

    const sessionMessage = {
      type: "session:start",
      data: {
        sessionId: "debug-session-" + Date.now(),
        sourceLanguage: "en",
        targetLanguage: "es",
      },
      timestamp: Date.now(),
    };

    console.log("Message:", JSON.stringify(sessionMessage, null, 2));
    ws.send(JSON.stringify(sessionMessage));

    // Send another message after 2 seconds to test if connection is still alive
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log("📤 Sending test ping message...");
        ws.send(
          JSON.stringify({
            type: "ping",
            data: { message: "test" },
            timestamp: Date.now(),
          })
        );
      } else {
        console.log("❌ Connection closed before ping");
      }
    }, 2000);
  }, 1000);
});

ws.on("message", function message(data) {
  messageCount++;
  console.log(`\n📥 Message #${messageCount}:`);

  try {
    const parsed = JSON.parse(data);
    console.log("  Type:", parsed.type);
    console.log("  Data:", JSON.stringify(parsed.data, null, 2));
    console.log(
      "  Timestamp:",
      new Date(parsed.timestamp || Date.now()).toISOString()
    );

    if (parsed.type === "session:started") {
      console.log("🎉 SUCCESS: Session started successfully!");

      // Test audio start
      setTimeout(() => {
        console.log("📤 Testing audio start...");
        ws.send(
          JSON.stringify({
            type: "audio:start",
            data: { tabId: 123 },
            timestamp: Date.now(),
          })
        );
      }, 1000);
    }

    if (parsed.type === "audio:started") {
      console.log("🎉 SUCCESS: Audio started successfully!");
    }
  } catch (e) {
    console.log("  Binary data:", data.length, "bytes");
  }
});

ws.on("ping", function () {
  console.log("📡 Received ping");
});

ws.on("pong", function () {
  console.log("📡 Received pong");
});

ws.on("error", function error(err) {
  console.error("\n❌ WebSocket error:", err.message);
  console.error("Error details:", err);
});

ws.on("close", function close(code, reason) {
  console.log(`\n🔌 Connection closed (code: ${code})`);
  if (reason) {
    console.log("Reason:", reason.toString());
  }
  console.log(`Total messages received: ${messageCount}`);
});

// Keep alive for 30 seconds
setTimeout(() => {
  console.log("\n🔚 Closing connection after 30 seconds...");
  ws.close();
}, 30000);





