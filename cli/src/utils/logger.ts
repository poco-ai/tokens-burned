type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = "info") {
    this.level = level;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(msg: string): void {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.debug) {
      process.stderr.write(`[debug] ${msg}\n`);
    }
  }

  info(msg: string): void {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.info) {
      process.stdout.write(`${msg}\n`);
    }
  }

  warn(msg: string): void {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.warn) {
      process.stderr.write(`warn: ${msg}\n`);
    }
  }

  error(msg: string): void {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.error) {
      process.stderr.write(`error: ${msg}\n`);
    }
  }

  log(msg: string): void {
    this.info(msg);
  }
}

export const logger = new Logger();
