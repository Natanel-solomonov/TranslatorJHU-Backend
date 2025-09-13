import { Router } from "express";
import multer from "multer";
import { logger } from "../utils/logger";
import { VoiceCloningService } from "../services/voiceCloning/voiceCloningService";
import { MLPipelineService } from "../services/mlPipeline/mlPipelineService";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const voiceCloningService = new VoiceCloningService();
const mlPipelineService = new MLPipelineService();

// Analyze voice characteristics
router.post("/analyze", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Audio file is required",
      });
    }

    const { language = "en" } = req.body;
    const audioData = req.file.buffer;

    const analysis = await voiceCloningService.analyzeVoice(audioData, language);

    if (!analysis) {
      return res.status(500).json({
        success: false,
        error: "Voice analysis failed",
      });
    }

    return res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    logger.error("Voice analysis endpoint error:", error);
    return res.status(500).json({
      success: false,
      error: "Voice analysis failed",
    });
  }
});

// Clone voice
router.post("/clone", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Audio file is required",
      });
    }

    const { name, description, language = "en" } = req.body;
    const audioData = req.file.buffer;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Voice name is required",
      });
    }

    const voiceClone = await voiceCloningService.cloneVoice(
      audioData,
      name,
      description || "",
      language
    );

    if (!voiceClone) {
      return res.status(500).json({
        success: false,
        error: "Voice cloning failed",
      });
    }

    return res.json({
      success: true,
      voice: voiceClone,
    });
  } catch (error) {
    logger.error("Voice cloning endpoint error:", error);
    return res.status(500).json({
      success: false,
      error: "Voice cloning failed",
    });
  }
});

// Synthesize with cloned voice
router.post("/synthesize/:voiceId", async (req, res) => {
  try {
    const { voiceId } = req.params;
    const { text, settings } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: "Text is required",
      });
    }

    const audioData = await voiceCloningService.synthesizeWithClone(
      text,
      voiceId,
      settings
    );

    if (!audioData) {
      return res.status(500).json({
        success: false,
        error: "Voice synthesis failed",
      });
    }

    res.setHeader("Content-Type", "audio/mpeg");
    return res.send(Buffer.from(audioData));
  } catch (error) {
    logger.error("Voice synthesis endpoint error:", error);
    return res.status(500).json({
      success: false,
      error: "Voice synthesis failed",
    });
  }
});

// Get cloned voices
router.get("/voices", (req, res) => {
  try {
    const voices = voiceCloningService.getClonedVoices();
    return res.json({
      success: true,
      voices,
    });
  } catch (error) {
    logger.error("Get voices endpoint error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get voices",
    });
  }
});

// Compare voices
router.post("/compare", async (req, res) => {
  try {
    const { voiceId1, voiceId2 } = req.body;

    if (!voiceId1 || !voiceId2) {
      return res.status(400).json({
        success: false,
        error: "Both voice IDs are required",
      });
    }

    const similarity = await voiceCloningService.compareVoices(voiceId1, voiceId2);

    if (!similarity) {
      return res.status(404).json({
        success: false,
        error: "One or both voices not found",
      });
    }

    return res.json({
      success: true,
      similarity,
    });
  } catch (error) {
    logger.error("Voice comparison endpoint error:", error);
    return res.status(500).json({
      success: false,
      error: "Voice comparison failed",
    });
  }
});

// Find similar voices
router.post("/similar", async (req, res) => {
  try {
    const { voiceId, threshold = 0.7, maxResults = 10 } = req.body;

    if (!voiceId) {
      return res.status(400).json({
        success: false,
        error: "Voice ID is required",
      });
    }

    const similarVoices = await voiceCloningService.findSimilarVoices(
      voiceId,
      threshold
    );

    return res.json({
      success: true,
      similarVoices,
    });
  } catch (error) {
    logger.error("Find similar voices endpoint error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to find similar voices",
    });
  }
});

// Update voice settings
router.put("/voices/:voiceId/settings", async (req, res) => {
  try {
    const { voiceId } = req.params;
    const settings = req.body;

    const success = await voiceCloningService.updateVoiceSettings(voiceId, settings);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: "Failed to update voice settings",
      });
    }

    return res.json({
      success: true,
      message: "Voice settings updated",
    });
  } catch (error) {
    logger.error("Update voice settings endpoint error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update voice settings",
    });
  }
});

// Delete voice
router.delete("/voices/:voiceId", async (req, res) => {
  try {
    const { voiceId } = req.params;

    const success = await voiceCloningService.deleteVoice(voiceId);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: "Failed to delete voice",
      });
    }

    return res.json({
      success: true,
      message: "Voice deleted",
    });
  } catch (error) {
    logger.error("Delete voice endpoint error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete voice",
    });
  }
});

// ML Pipeline endpoints

// Extract voice embedding
router.post("/ml/embedding", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Audio file is required",
      });
    }

    const { voiceId, metadata = {} } = req.body;
    const audioData = req.file.buffer;

    if (!voiceId) {
      return res.status(400).json({
        success: false,
        error: "Voice ID is required",
      });
    }

    const embedding = await mlPipelineService.extractVoiceEmbedding(
      audioData,
      voiceId,
      metadata
    );

    if (!embedding) {
      return res.status(500).json({
        success: false,
        error: "Failed to extract voice embedding",
      });
    }

    return res.json({
      success: true,
      embedding,
    });
  } catch (error) {
    logger.error("Extract embedding endpoint error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to extract voice embedding",
    });
  }
});

// Find similar voices using ML
router.post("/ml/similar", async (req, res) => {
  try {
    const { voiceId, threshold = 0.7, maxResults = 10 } = req.body;

    if (!voiceId) {
      return res.status(400).json({
        success: false,
        error: "Voice ID is required",
      });
    }

    const similarVoices = await mlPipelineService.findSimilarVoices(
      voiceId,
      threshold,
      maxResults
    );

    return res.json({
      success: true,
      similarVoices,
    });
  } catch (error) {
    logger.error("ML similar voices endpoint error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to find similar voices",
    });
  }
});

// Adapt voice
router.post("/ml/adapt", async (req, res) => {
  try {
    const { voiceId, adaptationType, parameters } = req.body;

    if (!voiceId || !adaptationType) {
      return res.status(400).json({
        success: false,
        error: "Voice ID and adaptation type are required",
      });
    }

    const adaptation = await mlPipelineService.adaptVoice(
      voiceId,
      adaptationType,
      parameters || {}
    );

    if (!adaptation) {
      return res.status(500).json({
        success: false,
        error: "Voice adaptation failed",
      });
    }

    return res.json({
      success: true,
      adaptation,
    });
  } catch (error) {
    logger.error("Voice adaptation endpoint error:", error);
    return res.status(500).json({
      success: false,
      error: "Voice adaptation failed",
    });
  }
});

// Personalize voice
router.post("/ml/personalize", async (req, res) => {
  try {
    const { voiceId, preferences } = req.body;

    if (!voiceId || !preferences) {
      return res.status(400).json({
        success: false,
        error: "Voice ID and preferences are required",
      });
    }

    const personalizedVoice = await mlPipelineService.personalizeVoiceSynthesis(
      voiceId,
      preferences
    );

    if (!personalizedVoice) {
      return res.status(500).json({
        success: false,
        error: "Voice personalization failed",
      });
    }

    return res.json({
      success: true,
      personalizedVoice,
    });
  } catch (error) {
    logger.error("Voice personalization endpoint error:", error);
    return res.status(500).json({
      success: false,
      error: "Voice personalization failed",
    });
  }
});

// Cluster voices
router.post("/ml/cluster", async (req, res) => {
  try {
    const { algorithm = "kmeans" } = req.body;

    const clusters = await mlPipelineService.clusterVoices(algorithm);

    return res.json({
      success: true,
      clusters,
    });
  } catch (error) {
    logger.error("Voice clustering endpoint error:", error);
    return res.status(500).json({
      success: false,
      error: "Voice clustering failed",
    });
  }
});

// Train similarity model
router.post("/ml/train", upload.array("audioFiles"), async (req, res) => {
  try {
    const files = req.files as any[];
    const trainingData = req.body.trainingData;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Audio files are required",
      });
    }

    const trainingSamples = files.map((file, index) => ({
      voiceId: `training_${index}`,
      audioData: file.buffer,
      features: trainingData?.[index] || {},
      quality: 0.8,
    }));

    const success = await mlPipelineService.trainSimilarityModel(trainingSamples);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: "Model training failed",
      });
    }

    return res.json({
      success: true,
      message: "Model trained successfully",
    });
  } catch (error) {
    logger.error("Model training endpoint error:", error);
    return res.status(500).json({
      success: false,
      error: "Model training failed",
    });
  }
});

export { router as voiceCloningRoutes };
