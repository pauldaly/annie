import { LogLevel, Log, ConsoleConfig } from './types.js';
import { IDisposable } from './di-container.js';

export interface ILogger {
  debug(message: any): void;
  info(message: any): void;
  warn(message: any): void;
  error(message: any): void;
  fatal(message: any): void;
  getLevel(): string;
  setLevel(level: LogLevel): void;
  getConfig(): ConsoleConfig;
}

export class Logger implements ILogger, IDisposable {
    private static instance: Logger; // Keep for backward compatibility
    private logLevel: LogLevel;
    private logEnum: Log;
    private consoleConfig: ConsoleConfig;

    constructor(level: string = "Fatal") {
        this.logLevel = LogLevel[level as keyof typeof LogLevel] || LogLevel.Fatal;
        this.logEnum = {
            All: '',
            Debug: '',
            Info: '',
            Warn: '',
            Error: '',
            Fatal: '',
        };
    
        this.consoleConfig = {
            priority: true,
            log: true,
            info: true,
            warning: true,
            debug: true,
            error: true,
            verbose: true,
            separator: true,
            console: true,
            lastmethod: "",
        };
    }

    // Keep singleton for backward compatibility
    static getInstance(level?: string): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger(level);
        }
        return Logger.instance;
    }

    // Factory function for dependency injection
    static create(level: string = "Fatal"): Logger {
        return new Logger(level);
    }

    log(message: any, level: LogLevel = LogLevel.Info): void {
        if (level >= this.logLevel) {
            console.log(`[${LogLevel[level]}]`, message);
        }
    }

    debug(message: any): void {
        this.log(message, LogLevel.Debug);
    }

    info(message: any): void {
        this.log(message, LogLevel.Info);
    }

    warn(message: any): void {
        this.log(message, LogLevel.Warn);
    }

    error(message: any): void {
        this.log(message, LogLevel.Error);
    }

    fatal(message: any): void {
        this.log(message, LogLevel.Fatal);
    }

    getLevel(): string {
        return LogLevel[this.logLevel];
    }

    getConfig(): ConsoleConfig {
        return this.consoleConfig;
    }

    dispose(): void {
    // Clean up any resources if needed
    // For now, just clear the singleton instance if this is it
        if (Logger.instance === this) {
            Logger.instance = undefined as any;
        }
    }

    getLoggingString(): string {
        return this.logEnum[LogLevel[this.logLevel] as keyof Log];
    }

    setLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    getConsoleConfig(): ConsoleConfig {
        return this.consoleConfig;
    }
}
