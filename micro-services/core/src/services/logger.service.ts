import "reflect-metadata";
import { injectable, inject } from "inversify";
import { TYPES } from "../inversion-of-control/types";
import { LogLevel } from "../enums/logLevel.enum";
import { ErrorSerializer, ErrorSerializerFactory } from "../factories/errorSerializer.factory";
import { LogWriter, LogWriterFactory } from "../factories/logWriter.factory";
import { EnvConfigInterface } from "../config/env.config";

@injectable()
export class LoggerService implements LoggerServiceInterface {
  private logLevel: LogLevel;

  private logWriter: LogWriter;

  private errorSerializer: ErrorSerializer;

  constructor(
  @inject(TYPES.EnvConfigInterface) envConfig: LoggerServiceConfigInterface,
    @inject(TYPES.LogWriterFactory) logWriterFactory: LogWriterFactory,
    @inject(TYPES.ErrorSerializerFactory)
    errorSerializerFactory: ErrorSerializerFactory,
  ) {
    this.logLevel = envConfig.logLevel;
    this.logWriter = logWriterFactory();
    this.errorSerializer = errorSerializerFactory();
  }

  public trace(message: string, data: Record<string, unknown>, className: string): void {
    if (this.logLevel >= LogLevel.Trace) {
      this.logWriter.trace(`: ${className} : ${message}\n${this.serialize(data)}`);
    }
  }

  public info(message: string, data: Record<string, unknown>, className: string): void {
    if (this.logLevel >= LogLevel.Info) {
      this.logWriter.info(`: ${className} : ${message}\n${this.serialize(data)}`);
    }
  }

  public warn(message: string, data: Record<string, unknown>, className: string): void {
    if (this.logLevel >= LogLevel.Warn) {
      this.logWriter.warn(`: ${className} : ${message}\n${this.serialize(data)}`);
    }
  }

  public error(message: string, data: Record<string, unknown>, className: string): void {
    if (this.logLevel >= LogLevel.Error) {
      this.logWriter.error(`: ${className} : ${message}\n${this.serialize(data)}`);
    }
  }

  private serialize(data: Record<string, unknown>): string {
    try {
      const dataWithSerializedErrors = Object.entries(data).reduce((acc, [ key, value ]) => {
        if (value instanceof Error) {
          return {
            ...acc,
            [key]: this.errorSerializer.serializeError(value),
          };
        }

        return {
          ...acc,
          [key]: value,
        };
      }, {});

      return JSON.stringify(dataWithSerializedErrors, null, 2);
    } catch (error: unknown) {
      return '{ "error": "Error serializing data object" }';
    }
  }
}

export type LoggerServiceConfigInterface = Pick<EnvConfigInterface, "logLevel">;

export interface LoggerServiceInterface {
  trace(message: string, data: Record<string, unknown>, className: string): void;
  info(message: string, data: Record<string, unknown>, className: string): void;
  warn(message: string, data: Record<string, unknown>, className: string): void;
  error(message: string, data: Record<string, unknown>, className: string): void;
}
