import { Request, Response } from "express";
import { getDataSource } from "../config/database";
import { User } from "../models/User";
import { TranslationSession } from "../models/TranslationSession";
import { CreateSessionDto, UpdateSessionDto } from "../dto/SessionDto";
import { logger } from "../utils/logger";

interface AuthenticatedRequest extends Request {
  user?: User;
  files?:
    | Express.Multer.File[]
    | { [fieldname: string]: Express.Multer.File[] }
    | undefined;
}

export class SessionController {
  private get userRepository() {
    return getDataSource().getRepository(User);
  }
  private get sessionRepository() {
    return getDataSource().getRepository(TranslationSession);
  }

  async createSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const sessionData: CreateSessionDto = req.body;

      const session = this.sessionRepository.create({
        userId: user.id,
        sourceLanguage: sessionData.sourceLanguage,
        targetLanguage: sessionData.targetLanguage,
        meetingPlatform: sessionData.meetingPlatform,
        meetingId: sessionData.meetingId,
        status: "active",
        audioSettings: sessionData.audioSettings || {
          sampleRate: 16000,
          channels: 1,
          chunkSize: 1024,
          voiceActivityDetection: true,
        },
        sessionMetadata: {
          totalDuration: 0,
          wordsTranslated: 0,
          averageLatency: 0,
          qualityScore: 0,
        },
      });

      const savedSession = await this.sessionRepository.save(session);

      logger.info(
        `Translation session created for user ${user.email}: ${savedSession.id}`
      );

      res.status(201).json({
        message: "Translation session created successfully",
        session: {
          id: savedSession.id,
          sourceLanguage: savedSession.sourceLanguage,
          targetLanguage: savedSession.targetLanguage,
          meetingPlatform: savedSession.meetingPlatform,
          meetingId: savedSession.meetingId,
          status: savedSession.status,
          audioSettings: savedSession.audioSettings,
          sessionMetadata: savedSession.sessionMetadata,
          startedAt: savedSession.startedAt,
        },
      });
    } catch (error) {
      logger.error("Create session error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { page = 1, limit = 10, status } = req.query;

      const queryBuilder = this.sessionRepository
        .createQueryBuilder("session")
        .where("session.userId = :userId", { userId: user.id });

      if (status) {
        queryBuilder.andWhere("session.status = :status", { status });
      }

      const sessions = await queryBuilder
        .orderBy("session.startedAt", "DESC")
        .skip((Number(page) - 1) * Number(limit))
        .take(Number(limit))
        .getMany();

      const totalCount = await queryBuilder.getCount();

      res.json({
        sessions: sessions.map((session) => ({
          id: session.id,
          sourceLanguage: session.sourceLanguage,
          targetLanguage: session.targetLanguage,
          meetingPlatform: session.meetingPlatform,
          meetingId: session.meetingId,
          status: session.status,
          sessionMetadata: session.sessionMetadata,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / Number(limit)),
        },
      });
    } catch (error) {
      logger.error("Get sessions error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { sessionId } = req.params;

      const session = await this.sessionRepository.findOne({
        where: { id: sessionId, userId: user.id },
      });

      if (!session) {
        res.status(404).json({ error: "Translation session not found" });
        return;
      }

      res.json({
        session: {
          id: session.id,
          sourceLanguage: session.sourceLanguage,
          targetLanguage: session.targetLanguage,
          meetingPlatform: session.meetingPlatform,
          meetingId: session.meetingId,
          status: session.status,
          sessionMetadata: session.sessionMetadata,
          audioSettings: session.audioSettings,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          updatedAt: session.updatedAt,
        },
      });
    } catch (error) {
      logger.error("Get session error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async updateSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { sessionId } = req.params;
      const updateData: UpdateSessionDto = req.body;

      const session = await this.sessionRepository.findOne({
        where: { id: sessionId, userId: user.id },
      });

      if (!session) {
        res.status(404).json({ error: "Translation session not found" });
        return;
      }

      // Update session fields
      Object.assign(session, updateData);
      const updatedSession = await this.sessionRepository.save(session);

      logger.info(
        `Translation session updated for user ${user.email}: ${sessionId}`
      );

      res.json({
        message: "Translation session updated successfully",
        session: {
          id: updatedSession.id,
          sourceLanguage: updatedSession.sourceLanguage,
          targetLanguage: updatedSession.targetLanguage,
          meetingPlatform: updatedSession.meetingPlatform,
          meetingId: updatedSession.meetingId,
          status: updatedSession.status,
          sessionMetadata: updatedSession.sessionMetadata,
          audioSettings: updatedSession.audioSettings,
          startedAt: updatedSession.startedAt,
          endedAt: updatedSession.endedAt,
          updatedAt: updatedSession.updatedAt,
        },
      });
    } catch (error) {
      logger.error("Update session error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async deleteSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { sessionId } = req.params;

      const session = await this.sessionRepository.findOne({
        where: { id: sessionId, userId: user.id },
      });

      if (!session) {
        res.status(404).json({ error: "Translation session not found" });
        return;
      }

      await this.sessionRepository.remove(session);

      logger.info(
        `Translation session deleted for user ${user.email}: ${sessionId}`
      );

      res.json({
        message: "Translation session deleted successfully",
      });
    } catch (error) {
      logger.error("Delete session error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async startSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { sessionId } = req.params;

      const session = await this.sessionRepository.findOne({
        where: { id: sessionId, userId: user.id },
      });

      if (!session) {
        res.status(404).json({ error: "Translation session not found" });
        return;
      }

      session.status = "active";
      session.startedAt = new Date();
      await this.sessionRepository.save(session);

      logger.info(
        `Translation session started for user ${user.email}: ${sessionId}`
      );

      res.json({
        message: "Translation session started successfully",
        session: {
          id: session.id,
          status: session.status,
          startedAt: session.startedAt,
        },
      });
    } catch (error) {
      logger.error("Start session error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async pauseSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { sessionId } = req.params;

      const session = await this.sessionRepository.findOne({
        where: { id: sessionId, userId: user.id },
      });

      if (!session) {
        res.status(404).json({ error: "Translation session not found" });
        return;
      }

      session.status = "paused";
      await this.sessionRepository.save(session);

      logger.info(
        `Translation session paused for user ${user.email}: ${sessionId}`
      );

      res.json({
        message: "Translation session paused successfully",
        session: {
          id: session.id,
          status: session.status,
          updatedAt: session.updatedAt,
        },
      });
    } catch (error) {
      logger.error("Pause session error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async endSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { sessionId } = req.params;

      const session = await this.sessionRepository.findOne({
        where: { id: sessionId, userId: user.id },
      });

      if (!session) {
        res.status(404).json({ error: "Translation session not found" });
        return;
      }

      session.status = "completed";
      session.endedAt = new Date();

      // Calculate final session duration
      if (session.startedAt) {
        const duration =
          session.endedAt.getTime() - session.startedAt.getTime();
        session.sessionMetadata = {
          totalDuration: Math.floor(duration / 1000), // Convert to seconds
          wordsTranslated: session.sessionMetadata?.wordsTranslated || 0,
          averageLatency: session.sessionMetadata?.averageLatency || 0,
          qualityScore: session.sessionMetadata?.qualityScore || 0,
        };
      }

      await this.sessionRepository.save(session);

      logger.info(
        `Translation session ended for user ${user.email}: ${sessionId}`
      );

      res.json({
        message: "Translation session ended successfully",
        session: {
          id: session.id,
          status: session.status,
          endedAt: session.endedAt,
          sessionMetadata: session.sessionMetadata,
        },
      });
    } catch (error) {
      logger.error("End session error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getSessionMetrics(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const user = req.user!;
      const { sessionId } = req.params;

      const session = await this.sessionRepository.findOne({
        where: { id: sessionId, userId: user.id },
      });

      if (!session) {
        res.status(404).json({ error: "Translation session not found" });
        return;
      }

      // TODO: Implement detailed analytics
      // This would include:
      // 1. Real-time latency metrics
      // 2. Translation accuracy scores
      // 3. Audio quality metrics
      // 4. Usage statistics

      const metrics = {
        sessionId: session.id,
        duration: session.sessionMetadata?.totalDuration || 0,
        wordsTranslated: session.sessionMetadata?.wordsTranslated || 0,
        averageLatency: session.sessionMetadata?.averageLatency || 0,
        qualityScore: session.sessionMetadata?.qualityScore || 0,
        realTimeMetrics: {
          currentLatency: 150, // ms
          audioQuality: 0.92,
          translationAccuracy: 0.88,
          voiceCloneQuality: 0.85,
        },
        usageStats: {
          activeTime: Math.floor(
            (Date.now() - session.startedAt.getTime()) / 1000
          ),
          pauseCount: 0,
          errorCount: 0,
          retryCount: 0,
        },
      };

      res.json({
        metrics,
      });
    } catch (error) {
      logger.error("Get session metrics error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
