import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDataSource } from "../config/database";
import { User } from "../models/User";
import { VoiceProfile } from "../models/VoiceProfile";
import { RegisterDto, LoginDto, UpdateProfileDto } from "../dto/AuthDto";
import { logger } from "../utils/logger";

interface AuthenticatedRequest extends Request {
  user?: User;
  files?:
    | Express.Multer.File[]
    | { [fieldname: string]: Express.Multer.File[] }
    | undefined;
}

export class AuthController {
  private get userRepository() {
    return getDataSource().getRepository(User);
  }
  private get voiceProfileRepository() {
    return getDataSource().getRepository(VoiceProfile);
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        preferredLanguage,
      }: RegisterDto = req.body;

      // Check if user already exists
      const existingUser = await this.userRepository.findOne({
        where: { email },
      });
      if (existingUser) {
        res.status(400).json({ error: "User already exists with this email" });
        return;
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || "12");
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = this.userRepository.create({
        email,
        passwordHash,
        firstName,
        lastName,
        preferredLanguage: preferredLanguage || "en",
      });

      const savedUser = await this.userRepository.save(user);

      // Create voice profile for new user
      const voiceProfile = this.voiceProfileRepository.create({
        userId: savedUser.id,
        processingStatus: "pending",
      });
      await this.voiceProfileRepository.save(voiceProfile);

      // Generate JWT token
      const jwtSecret = process.env.JWT_SECRET || "fallback-secret-key";
      const token = jwt.sign(
        { userId: savedUser.id, email: savedUser.email },
        jwtSecret as any,
        { expiresIn: "7d" }
      );

      logger.info(`New user registered: ${email}`);

      res.status(201).json({
        message: "User registered successfully",
        token,
        user: {
          id: savedUser.id,
          email: savedUser.email,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          preferredLanguage: savedUser.preferredLanguage,
          hasCompletedOnboarding: savedUser.hasCompletedOnboarding,
        },
      });
    } catch (error) {
      logger.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password }: LoginDto = req.body;

      // Find user
      const user = await this.userRepository.findOne({
        where: { email, isActive: true },
      });
      if (!user) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      // Generate JWT token
      const jwtSecret = process.env.JWT_SECRET || "fallback-secret-key";
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        jwtSecret as any,
        { expiresIn: "7d" }
      );

      logger.info(`User logged in: ${email}`);

      res.json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          preferredLanguage: user.preferredLanguage,
          hasCompletedOnboarding: user.hasCompletedOnboarding,
        },
      });
    } catch (error) {
      logger.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // In a real application, you might want to blacklist the token
      // For now, we'll just return success
      logger.info(`User logged out: ${req.user?.email}`);
      res.json({ message: "Logout successful" });
    } catch (error) {
      logger.error("Logout error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          preferredLanguage: user.preferredLanguage,
          hasCompletedOnboarding: user.hasCompletedOnboarding,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      logger.error("Get profile error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const updateData: UpdateProfileDto = req.body;

      // Update user fields
      Object.assign(user, updateData);
      const updatedUser = await this.userRepository.save(user);

      logger.info(`User profile updated: ${user.email}`);

      res.json({
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          fullName: updatedUser.fullName,
          preferredLanguage: updatedUser.preferredLanguage,
          hasCompletedOnboarding: updatedUser.hasCompletedOnboarding,
        },
      });
    } catch (error) {
      logger.error("Update profile error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async refreshToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;

      // Generate new JWT token
      const jwtSecret = process.env.JWT_SECRET || "fallback-secret-key";
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        jwtSecret as any,
        { expiresIn: "7d" }
      );

      res.json({
        message: "Token refreshed successfully",
        token,
      });
    } catch (error) {
      logger.error("Refresh token error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
