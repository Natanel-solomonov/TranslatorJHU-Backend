import { logger } from "../utils/logger";
import { STTService } from "./stt/sttService";
import { TranslationService } from "./translation/translationService";
import { TTSService } from "./tts/ttsService";

interface TranscriptionResult {
  id: string;
  text: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
}

interface TranslationResult {
  captionId: string;
  translatedText: string;
  confidence: number;
  audioData?: ArrayBuffer;
}

interface SessionData {
  sessionId: string;
  sourceLanguage: string;
  targetLanguage: string;
  audioBuffer: Buffer[];
  lastProcessedTime: number;
}

export class TranslationPipeline {
  private sttService: STTService;
  private translationService: TranslationService;
  private ttsService: TTSService;
  private sessions = new Map<string, SessionData>();

  constructor() {
    this.sttService = new STTService();
    this.translationService = new TranslationService();
    this.ttsService = new TTSService();
  }

  async startSession(
    sessionId: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<void> {
    logger.info(`Starting translation session: ${sessionId}`);

    const sessionData: SessionData = {
      sessionId,
      sourceLanguage,
      targetLanguage,
      audioBuffer: [],
      lastProcessedTime: Date.now(),
    };

    this.sessions.set(sessionId, sessionData);

    // Initialize services for the session
    await this.sttService.initializeSession(sessionId, sourceLanguage);
    await this.translationService.initializeSession(
      sessionId,
      sourceLanguage,
      targetLanguage
    );
    await this.ttsService.initializeSession(sessionId, targetLanguage);
  }

  async stopSession(sessionId: string): Promise<void> {
    logger.info(`Stopping translation session: ${sessionId}`);

    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      return;
    }

    // Clean up services
    await this.sttService.cleanupSession(sessionId);
    await this.translationService.cleanupSession(sessionId);
    await this.ttsService.cleanupSession(sessionId);

    this.sessions.delete(sessionId);
  }

  async processAudioChunk(
    clientId: string,
    audioData: Buffer,
    sourceLanguage: string,
    targetLanguage: string,
    onTranscription: (result: TranscriptionResult) => void,
    onTranslation: (result: TranslationResult) => void
  ): Promise<void> {
    const sessionId = `${clientId}_session`;

    // Ensure session exists
    if (!this.sessions.has(sessionId)) {
      await this.startSession(sessionId, sourceLanguage, targetLanguage);
    }

    const sessionData = this.sessions.get(sessionId)!;

    try {
      // 1. Speech-to-Text
      const transcriptionResult = await this.sttService.processAudio(
        sessionId,
        audioData,
        sourceLanguage
      );

      if (transcriptionResult) {
        // Send transcription to client
        onTranscription(transcriptionResult);

        // 2. Translation (only for final transcriptions)
        if (transcriptionResult.isFinal && transcriptionResult.text.trim()) {
          const translatedText = await this.translationService.translate(
            sessionId,
            transcriptionResult.text,
            sourceLanguage,
            targetLanguage
          );

          if (translatedText) {
            // 3. Text-to-Speech
            const audioData = await this.ttsService.synthesize(
              sessionId,
              translatedText,
              targetLanguage
            );

            // Send translation result to client
            const translationResult: TranslationResult = {
              captionId: transcriptionResult.id,
              translatedText,
              confidence: 0.9, // Translation confidence (could be improved)
              ...(audioData && { audioData }),
            };

            onTranslation(translationResult);
          }
        }
      }

      // Update session timestamp
      sessionData.lastProcessedTime = Date.now();
    } catch (error) {
      logger.error(
        `Error in translation pipeline for session ${sessionId}:`,
        error
      );
      throw error;
    }
  }

  async flushSession(sessionId: string): Promise<void> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      return;
    }

    try {
      // Flush any pending audio in STT service
      await this.sttService.flushSession(sessionId);

      logger.info(`Flushed session: ${sessionId}`);
    } catch (error) {
      logger.error(`Error flushing session ${sessionId}:`, error);
    }
  }

  async handleSilence(sessionId: string, timestamp: number): Promise<void> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      return;
    }

    try {
      // Handle silence detection for better transcription segmentation
      await this.sttService.handleSilence(sessionId, timestamp);
    } catch (error) {
      logger.error(`Error handling silence for session ${sessionId}:`, error);
    }
  }

  // Health check methods
  async checkServicesHealth(): Promise<{
    stt: boolean;
    translation: boolean;
    tts: boolean;
  }> {
    const results = await Promise.allSettled([
      this.sttService.healthCheck(),
      this.translationService.healthCheck(),
      this.ttsService.healthCheck(),
    ]);

    return {
      stt: results[0].status === "fulfilled" && results[0].value,
      translation: results[1].status === "fulfilled" && results[1].value,
      tts: results[2].status === "fulfilled" && results[2].value,
    };
  }

  getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  getSessionInfo(sessionId: string): SessionData | undefined {
    return this.sessions.get(sessionId);
  }
}
