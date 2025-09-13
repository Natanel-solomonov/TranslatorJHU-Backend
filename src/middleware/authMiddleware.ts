import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getDataSource } from "../config/database";
import { User } from "../models/User";
import { logger } from "../utils/logger";

interface AuthenticatedRequest extends Request {
  user?: User;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ error: "Access denied. No token provided." });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET || "fallback-secret-key";
    const decoded = jwt.verify(token, jwtSecret as any) as any;
    const userRepository = getDataSource().getRepository(User);

    const user = await userRepository.findOne({
      where: { id: decoded.userId, isActive: true },
    });

    if (!user) {
      res.status(401).json({ error: "Invalid token. User not found." });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error("Authentication error:", error);
    res.status(401).json({ error: "Invalid token." });
  }
};

export default authMiddleware;
