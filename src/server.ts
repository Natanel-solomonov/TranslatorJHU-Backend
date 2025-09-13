import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import { logger } from "./utils/logger";
import { WebSocketHandler } from "./websocket/websocketHandler";
import { TranslationPipeline } from "./services/translationPipeline";
import { errorHandler } from "./middleware/errorHandler";
import { healthRoutes } from "./routes/health";
import { configRoutes } from "./routes/config";
import { voiceCloningRoutes } from "./routes/voiceCloning";

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const port = process.env.PORT || 8080;

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow for extension communication
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow chrome extensions and localhost
      if (
        !origin ||
        origin.startsWith("chrome-extension://") ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("https://localhost:")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/api/health", healthRoutes);
app.use("/api/config", configRoutes);
app.use("/api/voice", voiceCloningRoutes);

// Error handling
app.use(errorHandler);

// Initialize translation pipeline
const translationPipeline = new TranslationPipeline();

// WebSocket server
const wss = new WebSocketServer({
  server,
  path: "/ws",
});

const wsHandler = new WebSocketHandler(wss, translationPipeline);

// Start server
server.listen(port, () => {
  logger.info(`🚀 TranslatorJHU Backend running on port ${port}`);
  logger.info(`📡 WebSocket server running on ws://localhost:${port}/ws`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT signal received: closing HTTP server");
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
});

export { app, server };
