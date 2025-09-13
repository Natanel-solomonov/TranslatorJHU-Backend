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
  onTranscription?: (result: TranscriptionResult) => void;
  lastInterimResult?: TranscriptionResult;
  finalizeTimer?: NodeJS.Timeout;
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
        process.env.GOOGLE_APPLICATION_CREDENTIALS &&
        process.env.GOOGLE_CLOUD_PROJECT_ID
      ) {
        this.speechClient = new SpeechClient({
          projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
          keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        });

        logger.info("Google Cloud Speech-to-Text initialized");
        this.isInitialized = true;
      } else {
        logger.warn("Google Cloud credentials not found, STT service disabled");
      }
    } catch (error) {
      logger.error("Failed to initialize STT service:", error);
    }
  }

  async initializeSession(
    sessionId: string,
    language: string,
    onTranscription?: (result: TranscriptionResult) => void
  ): Promise<void> {
    if (!this.speechClient || !this.isInitialized) {
      throw new Error("STT service not initialized");
    }

    try {
      // Create streaming recognition stream
      const request = {
        config: {
          encoding: "WEBM_OPUS" as const,
          sampleRateHertz: 48000, // Changed from 16000 to match typical browser audio
          languageCode: this.getLanguageCode(language),
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: false,
          model: "latest_long", // Best for real-time transcription
          useEnhanced: true,
          maxAlternatives: 1,
        },
        interimResults: true, // Enable interim results for real-time feedback
      };

      logger.info(`Creating STT stream for session ${sessionId} with config:`, {
        encoding: request.config.encoding,
        sampleRateHertz: request.config.sampleRateHertz,
        languageCode: request.config.languageCode,
        model: request.config.model,
      });

      const stream = this.speechClient.streamingRecognize(request);

      // Handle transcription results
      stream.on("data", (data) => {
        logger.debug(
          `STT stream data received for session ${sessionId}:`,
          data
        );
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

            logger.info(
              `STT transcription result for session ${sessionId}: "${transcriptionResult.text}" (isFinal: ${transcriptionResult.isFinal})`
            );

            // Store interim results and set up finalization timer
            if (!transcriptionResult.isFinal) {
              this.handleInterimResult(sessionId, transcriptionResult);
            }

            this.handleTranscriptionResult(sessionId, transcriptionResult);
          }
        } else {
          logger.debug(
            `STT stream data received but no results for session ${sessionId}`
          );
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
        onTranscription,
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
        logger.debug(
          `Sending ${audioData.length} bytes of audio data to Google Cloud Speech for session ${sessionId}`
        );
        session.stream.write(audioData);
        session.lastActivity = Date.now();
      } else {
        logger.warn(
          `Cannot send audio data for session ${sessionId}: stream is destroyed or null`
        );
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
      // Clear any pending finalize timer
      if (session.finalizeTimer) {
        clearTimeout(session.finalizeTimer);
      }

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

  private handleInterimResult(
    sessionId: string,
    result: TranscriptionResult
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Clear any existing finalize timer
    if (session.finalizeTimer) {
      clearTimeout(session.finalizeTimer);
    }

    // Store the latest interim result
    session.lastInterimResult = result;

    // Set a timer to auto-finalize after 2 seconds of silence
    session.finalizeTimer = setTimeout(() => {
      if (session.lastInterimResult && session.lastInterimResult.text.trim()) {
        logger.info(
          `Auto-finalizing transcription for session ${sessionId}: "${session.lastInterimResult.text}"`
        );

        // Create a final version of the last interim result
        const finalResult: TranscriptionResult = {
          ...session.lastInterimResult,
          isFinal: true,
          timestamp: Date.now(),
        };

        this.handleTranscriptionResult(sessionId, finalResult);
        session.lastInterimResult = undefined;
      }
    }, 2000); // 2 seconds delay
  }

  private handleTranscriptionResult(
    sessionId: string,
    result: TranscriptionResult
  ): void {
    const session = this.sessions.get(sessionId);
    if (session && session.onTranscription) {
      logger.info(
        `Calling onTranscription callback for session ${sessionId} with text: "${result.text}"`
      );
      session.onTranscription(result);
    } else {
      logger.warn(
        `No onTranscription callback found for session ${sessionId}. Session exists: ${!!session}, callback exists: ${!!session?.onTranscription}`
      );
    }

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
