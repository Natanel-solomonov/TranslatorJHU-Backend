import pino from "pino";

const isDevelopment = process.env.NODE_ENV === "development";

const loggerConfig = {
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label: string) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
} as any;

const logger = pino(loggerConfig);

export { logger };
