import { DataSource } from "typeorm";
import { User } from "../models/User";
import { VoiceProfile } from "../models/VoiceProfile";
import { VoiceSample } from "../models/VoiceSample";
import { TranslationSession } from "../models/TranslationSession";
import { logger } from "../utils/logger";

let AppDataSource: DataSource;

export const getDataSource = (): DataSource => {
  if (!AppDataSource) {
    throw new Error(
      "Database not initialized. Call initializeDatabase() first."
    );
  }
  return AppDataSource;
};

export const initializeDatabase = async (): Promise<void> => {
  try {
    logger.info("🔗 Attempting to connect to database...", {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      database: process.env.DB_NAME,
    });

    AppDataSource = new DataSource({
      type: "postgres",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      username: process.env.DB_USERNAME || "postgres",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "translator_jhu_dev",
      synchronize: process.env.NODE_ENV === "development", // Auto-sync in development
      logging: process.env.NODE_ENV === "development",
      entities: [User, VoiceProfile, VoiceSample, TranslationSession],
      migrations: ["src/migrations/*.ts"],
      subscribers: ["src/subscribers/*.ts"],
    });

    await AppDataSource.initialize();
    logger.info("🗄️  Database connection established successfully");
  } catch (error) {
    console.error("❌ Database connection failed:");
    console.error("Error:", error);
    console.error("Config:", {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      database: process.env.DB_NAME,
    });
    process.exit(1);
  }
};
