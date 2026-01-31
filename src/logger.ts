import * as fs from 'fs';
import * as path from 'path';
import { config } from './config';

type LogLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

class Logger {
  private logFile: string;

  constructor() {
    this.logFile = config.files.log;
    this.ensureLogDirectory();
  }

  private ensureLogDirectory() {
    const dir = path.dirname(this.logFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${level}: ${message}`;
  }

  private log(level: LogLevel, message: string) {
    const formatted = this.formatMessage(level, message);

    // Console with colors
    const colors = {
      INFO: '\x1b[36m',      // Cyan
      SUCCESS: '\x1b[32m',   // Green
      WARNING: '\x1b[33m',   // Yellow
      ERROR: '\x1b[31m'      // Red
    };
    const reset = '\x1b[0m';
    console.log(`${colors[level]}${formatted}${reset}`);

    // File (append)
    fs.appendFileSync(this.logFile, formatted + '\n');
  }

  info(message: string) {
    this.log('INFO', message);
  }

  success(message: string) {
    this.log('SUCCESS', message);
  }

  warning(message: string) {
    this.log('WARNING', message);
  }

  error(message: string, error?: Error) {
    const msg = error ? `${message}: ${error.message}` : message;
    this.log('ERROR', msg);
  }
}

// Export singleton instance
export const logger = new Logger();
