import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../../utils/logger";

interface SessionContext {
  sessionId: string;
  sourceLanguage: string;
  targetLanguage: string;
  conversationHistory: string[];
  glossary: Map<string, string>;
  lastTranslation: string;
}

export class TranslationService {
  private genAI: GoogleGenerativeAI | null = null;
  private sessions = new Map<string, SessionContext>();
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      if (process.env.GEMINI_API_KEY) {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.isInitialized = true;
        logger.info("Google Gemini translation service initialized");
      } else {
        logger.warn("Gemini API key not found, translation service disabled");
      }
    } catch (error) {
      logger.error("Failed to initialize translation service:", error);
    }
  }

  async initializeSession(
    sessionId: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<void> {
    if (!this.isInitialized || !this.genAI) {
      throw new Error("Translation service not initialized");
    }

    const sessionContext: SessionContext = {
      sessionId,
      sourceLanguage,
      targetLanguage,
      conversationHistory: [],
      glossary: new Map(),
      lastTranslation: "",
    };

    this.sessions.set(sessionId, sessionContext);

    logger.info(
      `Translation session initialized: ${sessionId} (${sourceLanguage} → ${targetLanguage})`
    );
  }

  async translate(
    sessionId: string,
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string | null> {
    if (!this.isInitialized || !this.genAI) {
      throw new Error("Translation service not initialized");
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      await this.initializeSession(sessionId, sourceLanguage, targetLanguage);
      return this.translate(sessionId, text, sourceLanguage, targetLanguage);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
      });

      // Build contextual prompt for better translation
      const prompt = this.buildTranslationPrompt(text, session);

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const translatedText = response.text().trim();

      // Update session context
      session.conversationHistory.push(`${sourceLanguage}: ${text}`);
      session.conversationHistory.push(`${targetLanguage}: ${translatedText}`);
      session.lastTranslation = translatedText;

      // Keep conversation history manageable (last 10 exchanges)
      if (session.conversationHistory.length > 20) {
        session.conversationHistory = session.conversationHistory.slice(-20);
      }

      logger.debug(`Translation for ${sessionId}:`, {
        original: text,
        translated: translatedText,
        sourceLanguage,
        targetLanguage,
      });

      return translatedText;
    } catch (error) {
      logger.error(`Translation error for session ${sessionId}:`, error);

      // Fallback to simple translation without context
      try {
        return await this.fallbackTranslation(
          text,
          sourceLanguage,
          targetLanguage
        );
      } catch (fallbackError) {
        logger.error(`Fallback translation failed:`, fallbackError);
        return null;
      }
    }
  }

  private buildTranslationPrompt(
    text: string,
    session: SessionContext
  ): string {
    const { sourceLanguage, targetLanguage, conversationHistory, glossary } =
      session;

    let prompt = `You are a professional real-time translator for video meetings and conferences. 

Your task is to translate the following ${this.getLanguageName(
      sourceLanguage
    )} text into ${this.getLanguageName(targetLanguage)}.

Guidelines:
1. Maintain the conversational tone and context of a meeting
2. Preserve technical terms, proper nouns, and company names
3. Keep translations natural and fluent
4. Consider the ongoing conversation context
5. For incomplete sentences or phrases, provide the most natural completion

`;

    // Add conversation context if available
    if (conversationHistory.length > 0) {
      prompt += `Recent conversation context:\n`;
      conversationHistory.slice(-6).forEach((line) => {
        prompt += `${line}\n`;
      });
      prompt += `\n`;
    }

    // Add glossary terms if available
    if (glossary.size > 0) {
      prompt += `Important terms to preserve:\n`;
      for (const [term, translation] of glossary.entries()) {
        prompt += `${term} → ${translation}\n`;
      }
      prompt += `\n`;
    }

    prompt += `Text to translate: "${text}"\n\n`;
    prompt += `Provide only the ${this.getLanguageName(
      targetLanguage
    )} translation, without explanations or quotes.`;

    return prompt;
  }

  private async fallbackTranslation(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string> {
    if (!this.genAI) {
      throw new Error("Gemini service not available");
    }

    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const simplePrompt = `Translate this ${this.getLanguageName(
      sourceLanguage
    )} text to ${this.getLanguageName(
      targetLanguage
    )}: "${text}". Provide only the translation.`;

    const result = await model.generateContent(simplePrompt);
    const response = await result.response;

    return response.text().trim();
  }

  async addGlossaryTerm(
    sessionId: string,
    originalTerm: string,
    translatedTerm: string
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.glossary.set(originalTerm.toLowerCase(), translatedTerm);
    logger.info(
      `Added glossary term for session ${sessionId}: ${originalTerm} → ${translatedTerm}`
    );
  }

  async cleanupSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    logger.info(`Translation session cleaned up: ${sessionId}`);
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isInitialized || !this.genAI) {
      return false;
    }

    try {
      // Test with a simple translation
      const model = this.genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
      });
      const result = await model.generateContent(
        "Translate 'hello' to Spanish. Provide only the translation."
      );
      const response = await result.response;

      return response.text().trim().toLowerCase().includes("hola");
    } catch (error) {
      logger.error("Translation health check failed:", error);
      return false;
    }
  }

  private getLanguageName(code: string): string {
    const languageNames: Record<string, string> = {
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      zh: "Chinese",
      ja: "Japanese",
      ko: "Korean",
      ar: "Arabic",
      ru: "Russian",
      hi: "Hindi",
    };

    return languageNames[code] || code;
  }

  getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  getSessionInfo(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      sessionId: session.sessionId,
      sourceLanguage: session.sourceLanguage,
      targetLanguage: session.targetLanguage,
      conversationLength: session.conversationHistory.length,
      glossarySize: session.glossary.size,
    };
  }
}
