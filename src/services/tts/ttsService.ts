import axios from "axios";
import { logger } from "../../utils/logger";

interface TTSProvider {
  name: string;
  synthesize: (
    text: string,
    language: string,
    voiceId?: string
  ) => Promise<ArrayBuffer>;
  isAvailable: () => boolean;
}

interface SessionConfig {
  sessionId: string;
  language: string;
  voiceId?: string;
  provider: string;
}

export class TTSService {
  private providers: Map<string, TTSProvider> = new Map();
  private sessions = new Map<string, SessionConfig>();
  private defaultProvider: string = "elevenlabs";

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // ElevenLabs - Best for natural voices
    if (process.env.ELEVENLABS_API_KEY) {
      this.providers.set("elevenlabs", {
        name: "ElevenLabs",
        synthesize: this.elevenLabsSynthesize.bind(this),
        isAvailable: () => !!process.env.ELEVENLABS_API_KEY,
      });
      this.defaultProvider = "elevenlabs";
      logger.info("ElevenLabs TTS provider initialized");
    }

    // Azure Cognitive Services
    if (process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) {
      this.providers.set("azure", {
        name: "Azure Neural TTS",
        synthesize: this.azureSynthesize.bind(this),
        isAvailable: () =>
          !!(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION),
      });
      if (
        this.defaultProvider === "elevenlabs" &&
        !process.env.ELEVENLABS_API_KEY
      ) {
        this.defaultProvider = "azure";
      }
      logger.info("Azure TTS provider initialized");
    }

    // Google Cloud TTS
    if (
      process.env.GOOGLE_TTS_API_KEY ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS
    ) {
      this.providers.set("google", {
        name: "Google Cloud TTS",
        synthesize: this.googleSynthesize.bind(this),
        isAvailable: () =>
          !!(
            process.env.GOOGLE_TTS_API_KEY ||
            process.env.GOOGLE_APPLICATION_CREDENTIALS
          ),
      });
      logger.info("Google TTS provider initialized");
    }

    // Cartesia AI
    if (process.env.CARTESIA_API_KEY) {
      this.providers.set("cartesia", {
        name: "Cartesia AI",
        synthesize: this.cartesiaSynthesize.bind(this),
        isAvailable: () => !!process.env.CARTESIA_API_KEY,
      });
      logger.info("Cartesia TTS provider initialized");
    }

    if (this.providers.size === 0) {
      logger.warn("No TTS providers configured");
    } else {
      logger.info(
        `TTS service initialized with ${this.providers.size} providers, default: ${this.defaultProvider}`
      );
    }
  }

  async initializeSession(sessionId: string, language: string): Promise<void> {
    const config: SessionConfig = {
      sessionId,
      language,
      voiceId: this.getDefaultVoiceId(language),
      provider: this.defaultProvider,
    };

    this.sessions.set(sessionId, config);
    logger.info(`TTS session initialized: ${sessionId} (${language})`);
  }

  async synthesize(
    sessionId: string,
    text: string,
    language: string
  ): Promise<ArrayBuffer | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      await this.initializeSession(sessionId, language);
      return this.synthesize(sessionId, text, language);
    }

    const provider = this.providers.get(session.provider);
    if (!provider || !provider.isAvailable()) {
      // Try fallback provider
      const fallbackProvider = this.findAvailableProvider();
      if (!fallbackProvider) {
        logger.error("No TTS providers available");
        return null;
      }

      logger.warn(
        `Primary TTS provider ${session.provider} unavailable, using ${fallbackProvider}`
      );
      session.provider = fallbackProvider;
      return this.synthesize(sessionId, text, language);
    }

    try {
      const audioData = await provider.synthesize(
        text,
        language,
        session.voiceId
      );

      logger.debug(`TTS synthesis completed for session ${sessionId}:`, {
        textLength: text.length,
        audioSize: audioData.byteLength,
        provider: session.provider,
      });

      return audioData;
    } catch (error) {
      logger.error(`TTS synthesis failed for session ${sessionId}:`, error);

      // Try fallback provider
      const fallbackProvider = this.findAvailableProvider(session.provider);
      if (fallbackProvider) {
        logger.info(`Trying fallback TTS provider: ${fallbackProvider}`);
        session.provider = fallbackProvider;
        return this.synthesize(sessionId, text, language);
      }

      return null;
    }
  }

  // ElevenLabs implementation
  private async elevenLabsSynthesize(
    text: string,
    language: string,
    voiceId?: string
  ): Promise<ArrayBuffer> {
    const apiKey = process.env.ELEVENLABS_API_KEY!;
    const voice = voiceId || this.getElevenLabsVoiceId(language);

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
      {
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      },
      {
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        responseType: "arraybuffer",
      }
    );

    return response.data;
  }

  // Azure implementation
  private async azureSynthesize(
    text: string,
    language: string,
    voiceId?: string
  ): Promise<ArrayBuffer> {
    const apiKey = process.env.AZURE_SPEECH_KEY!;
    const region = process.env.AZURE_SPEECH_REGION!;
    const voice = voiceId || this.getAzureVoiceId(language);

    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${this.getAzureLanguageCode(
      language
    )}">
      <voice name="${voice}">
        ${text}
      </voice>
    </speak>`;

    const response = await axios.post(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      ssml,
      {
        headers: {
          "Ocp-Apim-Subscription-Key": apiKey,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "riff-24khz-16bit-mono-pcm",
        },
        responseType: "arraybuffer",
      }
    );

    return response.data;
  }

  // Google Cloud TTS implementation
  private async googleSynthesize(
    text: string,
    language: string,
    voiceId?: string
  ): Promise<ArrayBuffer> {
    const apiKey = process.env.GOOGLE_TTS_API_KEY!;
    const voice = voiceId || this.getGoogleVoiceId(language);

    const response = await axios.post(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        input: { text },
        voice: {
          languageCode: this.getGoogleLanguageCode(language),
          name: voice,
        },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: 1.0,
          pitch: 0.0,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // Google returns base64 encoded audio
    const audioContent = response.data.audioContent;
    return Buffer.from(audioContent, "base64").buffer;
  }

  // Cartesia AI implementation
  private async cartesiaSynthesize(
    text: string,
    language: string,
    voiceId?: string
  ): Promise<ArrayBuffer> {
    const apiKey = process.env.CARTESIA_API_KEY!;
    const voice = voiceId || this.getCartesiaVoiceId(language);

    const response = await axios.post(
      "https://api.cartesia.ai/tts/bytes",
      {
        model_id: "sonic-english",
        transcript: text,
        voice: {
          mode: "id",
          id: voice,
        },
        output_format: {
          container: "mp3",
          encoding: "mp3",
          sample_rate: 22050,
        },
      },
      {
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      }
    );

    return response.data;
  }

  private findAvailableProvider(exclude?: string): string | null {
    for (const [name, provider] of this.providers.entries()) {
      if (name !== exclude && provider.isAvailable()) {
        return name;
      }
    }
    return null;
  }

  private getDefaultVoiceId(language: string): string {
    const provider = this.providers.get(this.defaultProvider);
    if (!provider) return "";

    switch (this.defaultProvider) {
      case "elevenlabs":
        return this.getElevenLabsVoiceId(language);
      case "azure":
        return this.getAzureVoiceId(language);
      case "google":
        return this.getGoogleVoiceId(language);
      case "cartesia":
        return this.getCartesiaVoiceId(language);
      default:
        return "";
    }
  }

  private getElevenLabsVoiceId(language: string): string {
    const voices: Record<string, string> = {
      en: process.env.ELEVENLABS_VOICE_ID || "Rachel",
      es: "Pablo",
      fr: "Antoine",
      de: "Giselle",
      it: "Francesca",
      pt: "Raquel",
      zh: "Zhou",
      ja: "Sakura",
      ko: "Jiwoo",
    };
    return voices[language] || voices["en"];
  }

  private getAzureVoiceId(language: string): string {
    const voices: Record<string, string> = {
      en: "en-US-JennyMultilingualNeural",
      es: "es-ES-ElviraNeural",
      fr: "fr-FR-DeniseNeural",
      de: "de-DE-KatjaNeural",
      it: "it-IT-ElsaNeural",
      pt: "pt-PT-RaquelNeural",
      zh: "zh-CN-XiaoxiaoNeural",
      ja: "ja-JP-NanamiNeural",
      ko: "ko-KR-SunHiNeural",
    };
    return voices[language] || voices["en"];
  }

  private getGoogleVoiceId(language: string): string {
    const voices: Record<string, string> = {
      en: "en-US-Wavenet-F",
      es: "es-ES-Wavenet-C",
      fr: "fr-FR-Wavenet-E",
      de: "de-DE-Wavenet-F",
      it: "it-IT-Wavenet-B",
      pt: "pt-PT-Wavenet-D",
      zh: "zh-CN-Wavenet-D",
      ja: "ja-JP-Wavenet-B",
      ko: "ko-KR-Wavenet-A",
    };
    return voices[language] || voices["en"];
  }

  private getCartesiaVoiceId(language: string): string {
    // Cartesia voice IDs would go here
    const voices: Record<string, string> = {
      en: "sonic-english-1",
      es: "sonic-spanish-1",
      fr: "sonic-french-1",
    };
    return voices[language] || voices["en"];
  }

  private getAzureLanguageCode(language: string): string {
    const codes: Record<string, string> = {
      en: "en-US",
      es: "es-ES",
      fr: "fr-FR",
      de: "de-DE",
      it: "it-IT",
      pt: "pt-PT",
      zh: "zh-CN",
      ja: "ja-JP",
      ko: "ko-KR",
    };
    return codes[language] || codes["en"];
  }

  private getGoogleLanguageCode(language: string): string {
    const codes: Record<string, string> = {
      en: "en-US",
      es: "es-ES",
      fr: "fr-FR",
      de: "de-DE",
      it: "it-IT",
      pt: "pt-PT",
      zh: "zh-CN",
      ja: "ja-JP",
      ko: "ko-KR",
    };
    return codes[language] || codes["en"];
  }

  async cleanupSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    logger.info(`TTS session cleaned up: ${sessionId}`);
  }

  async healthCheck(): Promise<boolean> {
    const availableProvider = this.findAvailableProvider();
    return !!availableProvider;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.entries())
      .filter(([_, provider]) => provider.isAvailable())
      .map(([name, _]) => name);
  }

  getActiveSessionsCount(): number {
    return this.sessions.size;
  }
}
