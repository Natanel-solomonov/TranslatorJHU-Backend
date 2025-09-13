import { Request, Response } from "express";
import { getDataSource } from "../config/database";
import { User } from "../models/User";
import { VoiceProfile } from "../models/VoiceProfile";
import { VoiceSample } from "../models/VoiceSample";
import {
  VoiceSampleUploadDto,
  VoiceAnalysisDto,
  VoiceSynthesisDto,
} from "../dto/VoiceDto";
import { logger } from "../utils/logger";

interface AuthenticatedRequest extends Request {
  user?: User;
  files?:
    | Express.Multer.File[]
    | { [fieldname: string]: Express.Multer.File[] }
    | undefined;
}

export class VoiceController {
  private get userRepository() { return getDataSource().getRepository(User); }
  private get voiceProfileRepository() { return getDataSource().getRepository(VoiceProfile); }
  private get voiceSampleRepository() { return getDataSource().getRepository(VoiceSample); }

  async uploadVoiceSamples(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const user = req.user!;
      const files = req.files as Express.Multer.File[];
      const { description, sampleType }: VoiceSampleUploadDto = req.body;

      if (!files || files.length === 0) {
        res.status(400).json({ error: "No voice samples uploaded" });
        return;
      }

      // Get or create voice profile
      let voiceProfile = await this.voiceProfileRepository.findOne({
        where: { userId: user.id },
      });

      if (!voiceProfile) {
        voiceProfile = this.voiceProfileRepository.create({
          userId: user.id,
          processingStatus: "pending",
        });
        await this.voiceProfileRepository.save(voiceProfile);
      }

      // Save voice samples
      const savedSamples: VoiceSample[] = [];
      for (const file of files) {
        const voiceSample = this.voiceSampleRepository.create({
          voiceProfileId: voiceProfile.id,
          filename: file.filename,
          originalFilename: file.originalname,
          filePath: file.path,
          mimeType: file.mimetype,
          fileSize: file.size,
          duration: 0, // Will be calculated during processing
        });

        const savedSample = await this.voiceSampleRepository.save(voiceSample);
        savedSamples.push(savedSample);
      }

      // Update voice profile status
      voiceProfile.processingStatus = "pending";
      await this.voiceProfileRepository.save(voiceProfile);

      logger.info(
        `Voice samples uploaded for user ${user.email}: ${files.length} files`
      );

      res.status(201).json({
        message: "Voice samples uploaded successfully",
        samples: savedSamples.map((sample) => ({
          id: sample.id,
          filename: sample.filename,
          originalFilename: sample.originalFilename,
          fileSize: sample.fileSize,
          mimeType: sample.mimeType,
          createdAt: sample.createdAt,
        })),
        voiceProfileId: voiceProfile.id,
      });
    } catch (error) {
      logger.error("Upload voice samples error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getVoiceProfile(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const user = req.user!;

      const voiceProfile = await this.voiceProfileRepository.findOne({
        where: { userId: user.id },
        relations: ["voiceSamples"],
      });

      if (!voiceProfile) {
        res.status(404).json({ error: "Voice profile not found" });
        return;
      }

      res.json({
        voiceProfile: {
          id: voiceProfile.id,
          userId: voiceProfile.userId,
          elevenLabsVoiceId: voiceProfile.elevenLabsVoiceId,
          voiceCharacteristics: voiceProfile.voiceCharacteristics,
          audioFeatures: voiceProfile.audioFeatures,
          isProcessed: voiceProfile.isProcessed,
          isCloned: voiceProfile.isCloned,
          cloneQuality: voiceProfile.cloneQuality,
          processingStatus: voiceProfile.processingStatus,
          createdAt: voiceProfile.createdAt,
          updatedAt: voiceProfile.updatedAt,
          voiceSamples: voiceProfile.voiceSamples?.map((sample) => ({
            id: sample.id,
            filename: sample.filename,
            originalFilename: sample.originalFilename,
            fileSize: sample.fileSize,
            duration: sample.duration,
            mimeType: sample.mimeType,
            isProcessed: sample.isProcessed,
            isValid: sample.isValid,
            createdAt: sample.createdAt,
          })),
        },
      });
    } catch (error) {
      logger.error("Get voice profile error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async analyzeVoiceSamples(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const user = req.user!;
      const { sampleIds, createClone }: VoiceAnalysisDto = req.body;

      const voiceProfile = await this.voiceProfileRepository.findOne({
        where: { userId: user.id },
      });

      if (!voiceProfile) {
        res.status(404).json({ error: "Voice profile not found" });
        return;
      }

      // Update processing status
      voiceProfile.processingStatus = "processing";
      await this.voiceProfileRepository.save(voiceProfile);

      // TODO: Implement actual voice analysis logic
      // This would include:
      // 1. Audio feature extraction (MFCC, spectral features)
      // 2. Voice characteristic analysis (pitch, tone, accent)
      // 3. Quality assessment
      // 4. Voice cloning preparation

      // Simulate processing time
      setTimeout(async () => {
        voiceProfile.processingStatus = "completed";
        voiceProfile.isProcessed = true;
        voiceProfile.voiceCharacteristics = {
          pitch: 220, // Hz
          tone: "warm",
          accent: "neutral",
          speed: 150, // words per minute
          emotion: "neutral",
        };
        voiceProfile.audioFeatures = {
          mfcc: [0.1, 0.2, 0.3], // Simplified MFCC features
          spectralCentroid: 1000,
          spectralRolloff: 2000,
          zeroCrossingRate: 0.05,
        };

        if (createClone) {
          voiceProfile.isCloned = true;
          voiceProfile.elevenLabsVoiceId = `voice_${user.id}_${Date.now()}`;
          voiceProfile.cloneQuality = 0.85;
        }

        await this.voiceProfileRepository.save(voiceProfile);
        logger.info(`Voice analysis completed for user ${user.email}`);
      }, 5000);

      res.json({
        message: "Voice analysis started",
        processingStatus: "processing",
        estimatedTime: "30-60 seconds",
      });
    } catch (error) {
      logger.error("Analyze voice samples error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async createVoiceClone(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const user = req.user!;

      const voiceProfile = await this.voiceProfileRepository.findOne({
        where: { userId: user.id },
      });

      if (!voiceProfile) {
        res.status(404).json({ error: "Voice profile not found" });
        return;
      }

      if (!voiceProfile.isProcessed) {
        res
          .status(400)
          .json({ error: "Voice profile must be processed before cloning" });
        return;
      }

      // TODO: Implement actual voice cloning logic with ElevenLabs API
      // This would include:
      // 1. Prepare voice samples for cloning
      // 2. Call ElevenLabs cloning API
      // 3. Store the cloned voice ID
      // 4. Update voice profile with clone information

      voiceProfile.processingStatus = "processing";
      await this.voiceProfileRepository.save(voiceProfile);

      // Simulate cloning process
      setTimeout(async () => {
        voiceProfile.isCloned = true;
        voiceProfile.elevenLabsVoiceId = `cloned_voice_${
          user.id
        }_${Date.now()}`;
        voiceProfile.cloneQuality = 0.92;
        voiceProfile.processingStatus = "completed";
        await this.voiceProfileRepository.save(voiceProfile);
        logger.info(`Voice clone created for user ${user.email}`);
      }, 10000);

      res.json({
        message: "Voice cloning started",
        processingStatus: "processing",
        estimatedTime: "1-2 minutes",
      });
    } catch (error) {
      logger.error("Create voice clone error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getCloneStatus(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const user = req.user!;

      const voiceProfile = await this.voiceProfileRepository.findOne({
        where: { userId: user.id },
      });

      if (!voiceProfile) {
        res.status(404).json({ error: "Voice profile not found" });
        return;
      }

      res.json({
        processingStatus: voiceProfile.processingStatus,
        isProcessed: voiceProfile.isProcessed,
        isCloned: voiceProfile.isCloned,
        cloneQuality: voiceProfile.cloneQuality,
        elevenLabsVoiceId: voiceProfile.elevenLabsVoiceId,
      });
    } catch (error) {
      logger.error("Get clone status error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async synthesizeVoice(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const user = req.user!;
      const { text, voiceId, speed, pitch, emotion }: VoiceSynthesisDto =
        req.body;

      const voiceProfile = await this.voiceProfileRepository.findOne({
        where: { userId: user.id },
      });

      if (!voiceProfile || !voiceProfile.isCloned) {
        res.status(400).json({ error: "Voice clone not available" });
        return;
      }

      // TODO: Implement actual voice synthesis with ElevenLabs API
      // This would include:
      // 1. Call ElevenLabs synthesis API with user's cloned voice
      // 2. Apply voice characteristics (speed, pitch, emotion)
      // 3. Return audio data or URL

      const synthesisResult = {
        audioUrl: `https://api.elevenlabs.io/v1/synthesis/${voiceProfile.elevenLabsVoiceId}`,
        duration: Math.ceil(text.length / 10), // Estimate duration
        voiceId: voiceId || voiceProfile.elevenLabsVoiceId,
        settings: {
          speed: speed || 1.0,
          pitch: pitch || 1.0,
          emotion: emotion || "neutral",
        },
      };

      logger.info(`Voice synthesis requested for user ${user.email}`);

      res.json({
        message: "Voice synthesis completed",
        result: synthesisResult,
      });
    } catch (error) {
      logger.error("Synthesize voice error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async deleteVoiceSample(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const user = req.user!;
      const { sampleId } = req.params;

      const voiceProfile = await this.voiceProfileRepository.findOne({
        where: { userId: user.id },
      });

      if (!voiceProfile) {
        res.status(404).json({ error: "Voice profile not found" });
        return;
      }

      const voiceSample = await this.voiceSampleRepository.findOne({
        where: { id: sampleId as string, voiceProfileId: voiceProfile.id },
      });

      if (!voiceSample) {
        res.status(404).json({ error: "Voice sample not found" });
        return;
      }

      await this.voiceSampleRepository.remove(voiceSample);

      logger.info(`Voice sample deleted for user ${user.email}: ${sampleId}`);

      res.json({
        message: "Voice sample deleted successfully",
      });
    } catch (error) {
      logger.error("Delete voice sample error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getVoiceSamples(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const user = req.user!;

      const voiceProfile = await this.voiceProfileRepository.findOne({
        where: { userId: user.id },
        relations: ["voiceSamples"],
      });

      if (!voiceProfile) {
        res.status(404).json({ error: "Voice profile not found" });
        return;
      }

      const samples = voiceProfile.voiceSamples?.map((sample) => ({
        id: sample.id,
        filename: sample.filename,
        originalFilename: sample.originalFilename,
        fileSize: sample.fileSize,
        duration: sample.duration,
        mimeType: sample.mimeType,
        audioMetadata: sample.audioMetadata,
        qualityMetrics: sample.qualityMetrics,
        isProcessed: sample.isProcessed,
        isValid: sample.isValid,
        transcription: sample.transcription,
        createdAt: sample.createdAt,
      }));

      res.json({
        voiceSamples: samples || [],
      });
    } catch (error) {
      logger.error("Get voice samples error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
