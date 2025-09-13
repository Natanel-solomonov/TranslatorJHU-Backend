import { Router } from "express";
import { logger } from "../utils/logger";

const router = Router();

interface ConfigResponse {
  languages: {
    supported: Array<{
      code: string;
      name: string;
      nativeName: string;
    }>;
  };
  tts: {
    provider: string;
    voices: Array<{
      id: string;
      name: string;
      gender: string;
      language: string;
    }>;
  };
  features: {
    realTimeTranslation: boolean;
    voiceActivityDetection: boolean;
    naturalVoices: boolean;
    multipleLanguages: boolean;
  };
}

router.get("/", (req, res) => {
  try {
    const config: ConfigResponse = {
      languages: {
        supported: [
          { code: "en", name: "English", nativeName: "English" },
          { code: "es", name: "Spanish", nativeName: "Español" },
          { code: "fr", name: "French", nativeName: "Français" },
          { code: "de", name: "German", nativeName: "Deutsch" },
          { code: "it", name: "Italian", nativeName: "Italiano" },
          { code: "pt", name: "Portuguese", nativeName: "Português" },
          { code: "zh", name: "Chinese", nativeName: "中文" },
          { code: "ja", name: "Japanese", nativeName: "日本語" },
          { code: "ko", name: "Korean", nativeName: "한국어" },
          { code: "ar", name: "Arabic", nativeName: "العربية" },
          { code: "ru", name: "Russian", nativeName: "Русский" },
          { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
        ],
      },
      tts: {
        provider: getTTSProvider(),
        voices: getAvailableVoices(),
      },
      features: {
        realTimeTranslation: true,
        voiceActivityDetection: true,
        naturalVoices: true,
        multipleLanguages: true,
      },
    };

    res.json(config);
  } catch (error) {
    logger.error("Failed to get config:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get configuration",
    });
  }
});

router.get("/languages", (req, res) => {
  try {
    const languages = [
      { code: "en", name: "English", nativeName: "English" },
      { code: "es", name: "Spanish", nativeName: "Español" },
      { code: "fr", name: "French", nativeName: "Français" },
      { code: "de", name: "German", nativeName: "Deutsch" },
      { code: "it", name: "Italian", nativeName: "Italiano" },
      { code: "pt", name: "Portuguese", nativeName: "Português" },
      { code: "zh", name: "Chinese", nativeName: "中文" },
      { code: "ja", name: "Japanese", nativeName: "日本語" },
      { code: "ko", name: "Korean", nativeName: "한국어" },
      { code: "ar", name: "Arabic", nativeName: "العربية" },
      { code: "ru", name: "Russian", nativeName: "Русский" },
      { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
    ];

    res.json({ languages });
  } catch (error) {
    logger.error("Failed to get languages:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get supported languages",
    });
  }
});

router.get("/voices", (req, res) => {
  try {
    const voices = getAvailableVoices();
    res.json({ voices });
  } catch (error) {
    logger.error("Failed to get voices:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get available voices",
    });
  }
});

function getTTSProvider(): string {
  if (process.env.ELEVENLABS_API_KEY) return "elevenlabs";
  if (process.env.AZURE_SPEECH_KEY) return "azure";
  if (process.env.CARTESIA_API_KEY) return "cartesia";
  if (process.env.GOOGLE_TTS_API_KEY) return "google";
  return "none";
}

function getAvailableVoices() {
  const provider = getTTSProvider();

  switch (provider) {
    case "elevenlabs":
      return [
        { id: "Rachel", name: "Rachel", gender: "female", language: "en" },
        { id: "Drew", name: "Drew", gender: "male", language: "en" },
        { id: "Clyde", name: "Clyde", gender: "male", language: "en" },
        { id: "Paul", name: "Paul", gender: "male", language: "en" },
        { id: "Domi", name: "Domi", gender: "female", language: "en" },
      ];

    case "azure":
      return [
        {
          id: "en-US-JennyNeural",
          name: "Jenny",
          gender: "female",
          language: "en",
        },
        { id: "en-US-GuyNeural", name: "Guy", gender: "male", language: "en" },
        {
          id: "es-ES-ElviraNeural",
          name: "Elvira",
          gender: "female",
          language: "es",
        },
        {
          id: "fr-FR-DeniseNeural",
          name: "Denise",
          gender: "female",
          language: "fr",
        },
      ];

    case "google":
      return [
        {
          id: "en-US-Wavenet-D",
          name: "Wavenet D",
          gender: "male",
          language: "en",
        },
        {
          id: "en-US-Wavenet-F",
          name: "Wavenet F",
          gender: "female",
          language: "en",
        },
        {
          id: "es-ES-Wavenet-B",
          name: "Wavenet B",
          gender: "male",
          language: "es",
        },
      ];

    default:
      return [];
  }
}

export { router as configRoutes };
