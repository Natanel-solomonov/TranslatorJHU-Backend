import { Router } from "express";
import { logger } from "../utils/logger";

const router = Router();

interface HealthStatus {
  status: "healthy" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    stt: "available" | "unavailable" | "error";
    translation: "available" | "unavailable" | "error";
    tts: "available" | "unavailable" | "error";
  };
}

router.get("/", async (req, res) => {
  try {
    const health: HealthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      services: {
        stt: checkSTTService(),
        translation: checkTranslationService(),
        tts: checkTTSService(),
      },
    };

    // Check if any service is down
    const servicesDown = Object.values(health.services).some(
      (service) => service === "unavailable" || service === "error"
    );

    if (servicesDown) {
      health.status = "unhealthy";
      res.status(503);
    }

    res.json(health);
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Health check failed",
    });
  }
});

router.get("/ready", (req, res) => {
  // Readiness probe for Kubernetes/Docker
  const ready =
    checkSTTService() === "available" &&
    checkTranslationService() === "available" &&
    checkTTSService() === "available";

  if (ready) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false });
  }
});

router.get("/live", (req, res) => {
  // Liveness probe for Kubernetes/Docker
  res.status(200).json({ alive: true });
});

function checkSTTService(): "available" | "unavailable" | "error" {
  try {
    // Check if Google Cloud credentials are available
    if (
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.GOOGLE_CLOUD_PROJECT_ID
    ) {
      return "available";
    }
    return "unavailable";
  } catch (error) {
    return "error";
  }
}

function checkTranslationService(): "available" | "unavailable" | "error" {
  try {
    // Check if Gemini API key is available
    if (process.env.GEMINI_API_KEY) {
      return "available";
    }
    return "unavailable";
  } catch (error) {
    return "error";
  }
}

function checkTTSService(): "available" | "unavailable" | "error" {
  try {
    // Check if any TTS service is configured
    if (
      process.env.ELEVENLABS_API_KEY ||
      process.env.AZURE_SPEECH_KEY ||
      process.env.CARTESIA_API_KEY ||
      process.env.GOOGLE_TTS_API_KEY
    ) {
      return "available";
    }
    return "unavailable";
  } catch (error) {
    return "error";
  }
}

export { router as healthRoutes };
