import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";
import { TranslationPipeline } from "../services/translationPipeline";

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

interface ClientSession {
  id: string;
  ws: WebSocket;
  sessionId?: string;
  sourceLanguage: string;
  targetLanguage: string;
  isRecording: boolean;
  lastActivity: Date;
}

export class WebSocketHandler {
  private clients = new Map<string, ClientSession>();
  private translationPipeline: TranslationPipeline;

  constructor(
    private wss: WebSocketServer,
    translationPipeline: TranslationPipeline
  ) {
    this.translationPipeline = translationPipeline;
    this.setupWebSocketServer();
    this.startCleanupInterval();
  }

  private setupWebSocketServer() {
    this.wss.on("connection", (ws: WebSocket) => {
      const clientId = uuidv4();
      const client: ClientSession = {
        id: clientId,
        ws,
        sourceLanguage: "en",
        targetLanguage: "es",
        isRecording: false,
        lastActivity: new Date(),
      };

      this.clients.set(clientId, client);
      logger.info(`Client connected: ${clientId}`);

      ws.on("message", async (data) => {
        try {
          if (data instanceof Buffer) {
            // Binary audio data
            await this.handleAudioData(clientId, data);
          } else {
            // JSON message
            const message: WebSocketMessage = JSON.parse(data.toString());
            await this.handleMessage(clientId, message);
          }

          // Update last activity
          const clientSession = this.clients.get(clientId);
          if (clientSession) {
            clientSession.lastActivity = new Date();
          }
        } catch (error) {
          logger.error(`Error handling message from ${clientId}:`, error);
          this.sendError(clientId, "Invalid message format");
        }
      });

      ws.on("close", () => {
        logger.info(`Client disconnected: ${clientId}`);
        this.handleClientDisconnect(clientId);
      });

      ws.on("error", (error) => {
        logger.error(`WebSocket error for client ${clientId}:`, error);
        this.handleClientDisconnect(clientId);
      });

      // Send welcome message
      this.sendMessage(clientId, "connected", {
        clientId,
        message: "Connected to TranslatorJHU backend",
      });
    });
  }

  private async handleMessage(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId);
    if (!client) return;

    logger.debug(`Received message from ${clientId}:`, message.type);

    switch (message.type) {
      case "session:start":
        await this.handleSessionStart(clientId, message.data);
        break;

      case "session:stop":
        await this.handleSessionStop(clientId, message.data);
        break;

      case "audio:start":
        await this.handleAudioStart(clientId, message.data);
        break;

      case "audio:stop":
        await this.handleAudioStop(clientId, message.data);
        break;

      case "audio:silence":
        await this.handleAudioSilence(clientId, message.data);
        break;

      case "config:update":
        await this.handleConfigUpdate(clientId, message.data);
        break;

      default:
        logger.warn(`Unknown message type: ${message.type}`);
        this.sendError(clientId, `Unknown message type: ${message.type}`);
    }
  }

  private async handleAudioData(clientId: string, audioData: Buffer) {
    const client = this.clients.get(clientId);
    if (!client || !client.isRecording) {
      return;
    }

    try {
      // Process audio through translation pipeline
      await this.translationPipeline.processAudioChunk(
        clientId,
        audioData,
        client.sourceLanguage,
        client.targetLanguage,
        (transcription) => {
          this.sendMessage(clientId, "transcription", transcription);
        },
        (translation) => {
          this.sendMessage(clientId, "translation", translation);
        }
      );
    } catch (error) {
      logger.error(`Error processing audio for ${clientId}:`, error);
      this.sendError(clientId, "Audio processing failed");
    }
  }

  private async handleSessionStart(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      client.sessionId = data.sessionId || uuidv4();
      client.sourceLanguage = data.sourceLanguage || "en";
      client.targetLanguage = data.targetLanguage || "es";

      await this.translationPipeline.startSession(
        client.sessionId,
        client.sourceLanguage,
        client.targetLanguage
      );

      this.sendMessage(clientId, "session:started", {
        sessionId: client.sessionId,
        sourceLanguage: client.sourceLanguage,
        targetLanguage: client.targetLanguage,
      });

      logger.info(`Session started for ${clientId}: ${client.sessionId}`);
    } catch (error) {
      logger.error(`Failed to start session for ${clientId}:`, error);
      this.sendError(clientId, "Failed to start session");
    }
  }

  private async handleSessionStop(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client || !client.sessionId) return;

    try {
      await this.translationPipeline.stopSession(client.sessionId);

      client.sessionId = undefined;
      client.isRecording = false;

      this.sendMessage(clientId, "session:stopped", {
        message: "Session stopped successfully",
      });

      logger.info(`Session stopped for ${clientId}`);
    } catch (error) {
      logger.error(`Failed to stop session for ${clientId}:`, error);
      this.sendError(clientId, "Failed to stop session");
    }
  }

  private async handleAudioStart(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client || !client.sessionId) {
      this.sendError(clientId, "No active session");
      return;
    }

    client.isRecording = true;

    this.sendMessage(clientId, "audio:started", {
      message: "Audio recording started",
    });

    logger.info(`Audio recording started for ${clientId}`);
  }

  private async handleAudioStop(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.isRecording = false;

    // Flush any remaining audio in the pipeline
    if (client.sessionId) {
      await this.translationPipeline.flushSession(client.sessionId);
    }

    this.sendMessage(clientId, "audio:stopped", {
      message: "Audio recording stopped",
    });

    logger.info(`Audio recording stopped for ${clientId}`);
  }

  private async handleAudioSilence(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client || !client.sessionId) return;

    // Handle silence detection for better transcription segmentation
    await this.translationPipeline.handleSilence(
      client.sessionId,
      data.timestamp
    );
  }

  private async handleConfigUpdate(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (data.sourceLanguage) {
      client.sourceLanguage = data.sourceLanguage;
    }
    if (data.targetLanguage) {
      client.targetLanguage = data.targetLanguage;
    }

    this.sendMessage(clientId, "config:updated", {
      sourceLanguage: client.sourceLanguage,
      targetLanguage: client.targetLanguage,
    });

    logger.info(`Config updated for ${clientId}`);
  }

  private handleClientDisconnect(clientId: string) {
    const client = this.clients.get(clientId);
    if (client && client.sessionId) {
      // Clean up session
      this.translationPipeline.stopSession(client.sessionId).catch((error) => {
        logger.error(`Error stopping session during disconnect: ${error}`);
      });
    }

    this.clients.delete(clientId);
  }

  private sendMessage(clientId: string, type: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: WebSocketMessage = {
      type,
      data,
      timestamp: Date.now(),
    };

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error(`Failed to send message to ${clientId}:`, error);
    }
  }

  private sendError(clientId: string, error: string) {
    this.sendMessage(clientId, "error", { error });
  }

  private startCleanupInterval() {
    setInterval(() => {
      const now = new Date();
      const timeout = 5 * 60 * 1000; // 5 minutes

      for (const [clientId, client] of this.clients.entries()) {
        if (now.getTime() - client.lastActivity.getTime() > timeout) {
          logger.info(`Cleaning up inactive client: ${clientId}`);
          this.handleClientDisconnect(clientId);
        }
      }
    }, 60000); // Check every minute
  }

  public getConnectedClients() {
    return this.clients.size;
  }

  public getActiveRecordings() {
    return Array.from(this.clients.values()).filter(
      (client) => client.isRecording
    ).length;
  }
}
