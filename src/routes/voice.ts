import { Router } from "express";
import multer from "multer";
import { VoiceController } from "../controllers/VoiceController";
import { authMiddleware } from "../middleware/authMiddleware";
import { validateRequest } from "../middleware/validateRequest";
import { VoiceSampleUploadDto } from "../dto/VoiceDto";

const router = Router();
const voiceController = new VoiceController();

// Configure multer for voice sample uploads
const upload = multer({
  dest: process.env.VOICE_SAMPLES_PATH || "./uploads/voice-samples",
  limits: {
    fileSize: parseInt(process.env.MAX_VOICE_SAMPLE_SIZE || "10485760"), // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (
      process.env.SUPPORTED_AUDIO_FORMATS || "mp3,wav,ogg,webm"
    )
      .split(",")
      .map((type) => `audio/${type}`);

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid audio format"));
    }
  },
});

/**
 * @route POST /api/voice/samples
 * @desc Upload voice samples for analysis
 * @access Private
 */
router.post(
  "/samples",
  authMiddleware,
  upload.array("voiceSamples", 5),
  validateRequest(VoiceSampleUploadDto),
  voiceController.uploadVoiceSamples.bind(voiceController)
);

/**
 * @route GET /api/voice/profile
 * @desc Get user's voice profile
 * @access Private
 */
router.get(
  "/profile",
  authMiddleware,
  voiceController.getVoiceProfile.bind(voiceController)
);

/**
 * @route POST /api/voice/analyze
 * @desc Analyze uploaded voice samples
 * @access Private
 */
router.post(
  "/analyze",
  authMiddleware,
  voiceController.analyzeVoiceSamples.bind(voiceController)
);

/**
 * @route POST /api/voice/clone
 * @desc Create voice clone from samples
 * @access Private
 */
router.post(
  "/clone",
  authMiddleware,
  voiceController.createVoiceClone.bind(voiceController)
);

/**
 * @route GET /api/voice/clone/status
 * @desc Get voice cloning status
 * @access Private
 */
router.get(
  "/clone/status",
  authMiddleware,
  voiceController.getCloneStatus.bind(voiceController)
);

/**
 * @route POST /api/voice/synthesize
 * @desc Synthesize text with user's cloned voice
 * @access Private
 */
router.post(
  "/synthesize",
  authMiddleware,
  voiceController.synthesizeVoice.bind(voiceController)
);

/**
 * @route DELETE /api/voice/samples/:sampleId
 * @desc Delete a voice sample
 * @access Private
 */
router.delete(
  "/samples/:sampleId",
  authMiddleware,
  voiceController.deleteVoiceSample.bind(voiceController)
);

/**
 * @route GET /api/voice/samples
 * @desc Get user's voice samples
 * @access Private
 */
router.get(
  "/samples",
  authMiddleware,
  voiceController.getVoiceSamples.bind(voiceController)
);

export { router as voiceRoutes };





