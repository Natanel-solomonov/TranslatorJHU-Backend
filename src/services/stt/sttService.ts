import { SpeechClient } from "@google-cloud/speech";
import { logger } from "../../utils/logger";
import { v4 as uuidv4 } from "uuid";

interface TranscriptionResult {
  id: string;
  text: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
}

interface SessionStream {
  stream: any;
  sessionId: string;
  language: string;
  lastActivity: number;
}

export class STTService {
  private speechClient: SpeechClient | null = null;
  private sessions = new Map<string, SessionStream>();
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize Google Cloud Speech client
      if (
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        process.env.GOOGLE_CLOUD_PROJECT_ID
      ) {
        const clientConfig: any = {};
        if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
          clientConfig.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        }
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          clientConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        }
        this.speechClient = new SpeechClient(clientConfig);

        logger.info("Google Cloud Speech-to-Text initialized");
        this.isInitialized = true;
      } else {
        logger.warn("Google Cloud credentials not found, STT service disabled");
      }
    } catch (error) {
      logger.error("Failed to initialize STT service:", error);
    }
  }

  async initializeSession(sessionId: string, language: string): Promise<void> {
    if (!this.speechClient || !this.isInitialized) {
      throw new Error("STT service not initialized");
    }

    try {
      // Create streaming recognition stream
      const request = {
        config: {
          encoding: "WEBM_OPUS" as const,
          sampleRateHertz: 16000,
          languageCode: this.getLanguageCode(language),
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: false,
          model: "latest_long", // Best for real-time transcription
          useEnhanced: true,
          maxAlternatives: 1,
        },
        interimResults: true, // Enable interim results for real-time feedback
      };

      const stream = this.speechClient.streamingRecognize(request);

      // Handle transcription results
      stream.on("data", (data) => {
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          const transcript = result.alternatives?.[0];

          if (transcript) {
            const transcriptionResult: TranscriptionResult = {
              id: uuidv4(),
              text: transcript.transcript || "",
              confidence: transcript.confidence || 0.8,
              isFinal: result.isFinal || false,
              timestamp: Date.now(),
            };

            this.handleTranscriptionResult(sessionId, transcriptionResult);
          }
        }
      });

      stream.on("error", (error) => {
        logger.error(`STT stream error for session ${sessionId}:`, error);
        this.handleStreamError(sessionId, error);
      });

      stream.on("end", () => {
        logger.info(`STT stream ended for session ${sessionId}`);
        this.sessions.delete(sessionId);
      });

      // Store session stream
      this.sessions.set(sessionId, {
        stream,
        sessionId,
        language,
        lastActivity: Date.now(),
      });

      logger.info(`STT session initialized: ${sessionId} (${language})`);
    } catch (error) {
      logger.error(`Failed to initialize STT session ${sessionId}:`, error);
      throw error;
    }
  }

  async processAudio(
    sessionId: string,
    audioData: Buffer,
    language: string
  ): Promise<TranscriptionResult | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      // Try to initialize session if it doesn't exist
      await this.initializeSession(sessionId, language);
      return this.processAudio(sessionId, audioData, language);
    }

    try {
      // Send audio data to the stream
      if (session.stream && !session.stream.destroyed) {
        session.stream.write(audioData);
        session.lastActivity = Date.now();
      }

      // Note: Results are handled asynchronously via the stream events
      return null;
    } catch (error) {
      logger.error(`Error processing audio for session ${sessionId}:`, error);
      throw error;
    }
  }

  async flushSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    try {
      // End the stream to flush any remaining audio
      if (session.stream && !session.stream.destroyed) {
        session.stream.end();
      }

      logger.info(`STT session flushed: ${sessionId}`);
    } catch (error) {
      logger.error(`Error flushing STT session ${sessionId}:`, error);
    }
  }

  async handleSilence(sessionId: string, timestamp: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    // Use silence detection to improve transcription segmentation
    // This could be used to force finalization of current transcription
    try {
      logger.debug(`Silence detected for session ${sessionId} at ${timestamp}`);

      // Optional: restart the stream for better segmentation
      // This would create cleaner transcript segments
    } catch (error) {
      logger.error(`Error handling silence for session ${sessionId}:`, error);
    }
  }

  async cleanupSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    try {
      if (session.stream && !session.stream.destroyed) {
        session.stream.destroy();
      }

      this.sessions.delete(sessionId);
      logger.info(`STT session cleaned up: ${sessionId}`);
    } catch (error) {
      logger.error(`Error cleaning up STT session ${sessionId}:`, error);
    }
  }

  async healthCheck(): Promise<boolean> {
    return this.isInitialized && this.speechClient !== null;
  }

  private handleTranscriptionResult(
    sessionId: string,
    result: TranscriptionResult
  ): void {
    // This would typically be handled by a callback or event system
    // For now, we'll log the result
    logger.debug(`Transcription for ${sessionId}:`, {
      text: result.text,
      confidence: result.confidence,
      isFinal: result.isFinal,
    });
  }

  private handleStreamError(sessionId: string, error: any): void {
    logger.error(`Stream error for session ${sessionId}:`, error);

    // Try to restart the session
    setTimeout(async () => {
      const session = this.sessions.get(sessionId);
      if (session) {
        try {
          await this.cleanupSession(sessionId);
          await this.initializeSession(sessionId, session.language);
          logger.info(`Restarted STT session: ${sessionId}`);
        } catch (restartError) {
          logger.error(
            `Failed to restart STT session ${sessionId}:`,
            restartError
          );
        }
      }
    }, 1000);
  }

  private getLanguageCode(language: string): string {
    const languageMap: Record<string, string> = {
      en: "en-US",
      es: "es-ES",
      fr: "fr-FR",
      de: "de-DE",
      it: "it-IT",
      pt: "pt-PT",
      zh: "zh-CN",
      ja: "ja-JP",
      ko: "ko-KR",
      ar: "ar-SA",
      ru: "ru-RU",
      hi: "hi-IN",
    };

    return languageMap[language] || "en-US";
  }

  getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  getSessionInfo(sessionId: string) {
    return this.sessions.get(sessionId);
  }
}
