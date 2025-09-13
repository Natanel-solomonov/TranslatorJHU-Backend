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
};

// Add transport only in development
if (isDevelopment) {
  (loggerConfig as any).transport = {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss Z",
      ignore: "pid,hostname",
    },
  };
}

export const logger = pino(loggerConfig);
