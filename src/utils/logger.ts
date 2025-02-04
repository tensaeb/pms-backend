import winston from "winston";
import dayjs from "dayjs";
import path from "path";
import fs from "fs";

const logDir = path.join(__dirname, "../../logs");

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log level prefixes for better visibility in log files
const levelPrefixes: Record<string, string> = {
  error: "❌ ERROR",
  warn: "⚠️ WARN ",
  info: "ℹ️ INFO ",
  http: "🌐 HTTP ",
  verbose: "🔊 VERBOSE",
  debug: "🐞 DEBUG",
  silly: "🤪 SILLY ",
};

// Define colors for winston (console logs only)
winston.addColors({
  error: "red",
  warn: "yellow",
  info: "blue",
  http: "magenta",
  verbose: "cyan",
  debug: "green",
  silly: "grey",
});

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message }) => {
      const levelText = levelPrefixes[level] || level.toUpperCase();
      return `${timestamp} [${levelText}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, `app-${dayjs().format("YYYY-MM-DD")}.log`),
      maxsize: 5242880,
      maxFiles: 5,
      tailable: true,
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.printf(({ timestamp, level, message }) => {
          const levelText = levelPrefixes[level] || level.toUpperCase();
          return `${timestamp} [${levelText}]: ${message}`;
        })
      ),
    }),
  ],
});

export default logger;
