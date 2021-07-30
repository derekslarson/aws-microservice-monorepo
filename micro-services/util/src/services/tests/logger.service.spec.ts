/* eslint-disable @typescript-eslint/unbound-method */
import errorSerializerObj from "serialize-error";
import { LogLevel } from "../../enums/logLevel.enum";
import { ErrorSerializer, ErrorSerializerFactory } from "../../factories/errorSerializer.factory";
import { LogWriter, LogWriterFactory } from "../../factories/logWriter.factory";
import { Spied, TestSupport } from "../../test-support";
import { LoggerServiceConfigInterface, LoggerServiceInterface, LoggerService } from "../logger.service";

describe("LoggerService", () => {
  const envConfig: LoggerServiceConfigInterface = { logLevel: LogLevel.Trace };
  let logWriter: Spied<LogWriter>;
  let errorSerializer: Spied<ErrorSerializer>;
  let loggerService: LoggerServiceInterface;

  const logWriterFactory: LogWriterFactory = () => logWriter as unknown as LogWriter;
  const errorSerializerFactory: ErrorSerializerFactory = () => errorSerializer;

  const mockMessage = "mock logging message";
  const mockData = { mock: "data" };
  const stringifiedMockData = JSON.stringify(mockData, null, 2);
  const mockClassName = "MockClass";
  const mockSerializedError = "{}";
  const mockError = new Error("Mock Error");

  beforeEach(() => {
    logWriter = TestSupport.spyOnObject(console);
    errorSerializer = TestSupport.spyOnObject(errorSerializerObj);

    errorSerializer.serializeError.and.returnValue(mockSerializedError);
    errorSerializer.deserializeError.and.returnValue(mockError);
  });

  describe("trace", () => {
    describe("under normal conditions", () => {
      describe("when logLevel is LogLevel.Trace", () => {
        beforeEach(() => {
          envConfig.logLevel = LogLevel.Trace;
          loggerService = new LoggerService(envConfig, logWriterFactory, errorSerializerFactory);
        });

        it("calls logWriter with the correct params", () => {
          loggerService.trace(mockMessage, mockData, mockClassName);

          expect(logWriter.trace).toHaveBeenCalledTimes(1);
          expect(logWriter.trace).toHaveBeenCalledWith(jasmine.stringMatching(`: ${mockClassName} : ${mockMessage}\n${stringifiedMockData}`));
        });

        it("doesnt call errorSerializer", () => {});
      });

      describe("when logLevel is lower than LogLevel.Trace", () => {
        beforeEach(() => {
          envConfig.logLevel = LogLevel.Info;
          loggerService = new LoggerService(envConfig, logWriterFactory, errorSerializerFactory);
        });

        it("doesn't call logWriter", () => {
          loggerService.trace(mockMessage, mockData, mockClassName);

          expect(logWriter.trace).toHaveBeenCalledTimes(0);
        });
      });
    });
  });

  describe("info", () => {
    describe("under normal conditions", () => {
      describe("when logLevel is LogLevel.Info", () => {
        beforeEach(() => {
          envConfig.logLevel = LogLevel.Info;
          loggerService = new LoggerService(envConfig, logWriterFactory, errorSerializerFactory);
        });

        it("calls logWriter with the correct params", () => {
          loggerService.info(mockMessage, mockData, mockClassName);

          expect(logWriter.info).toHaveBeenCalledTimes(1);
          expect(logWriter.info).toHaveBeenCalledWith(jasmine.stringMatching(`: ${mockClassName} : ${mockMessage}\n${stringifiedMockData}`));
        });
      });

      describe("when logLevel is lower than LogLevel.Info", () => {
        beforeEach(() => {
          envConfig.logLevel = LogLevel.Warn;
          loggerService = new LoggerService(envConfig, logWriterFactory, errorSerializerFactory);
        });

        it("doesn't call logWriter", () => {
          loggerService.info(mockMessage, mockData, mockClassName);

          expect(logWriter.info).toHaveBeenCalledTimes(0);
        });
      });
    });
  });

  describe("warn", () => {
    describe("under normal conditions", () => {
      describe("when logLevel is LogLevel.Warn", () => {
        beforeEach(() => {
          envConfig.logLevel = LogLevel.Warn;
          loggerService = new LoggerService(envConfig, logWriterFactory, errorSerializerFactory);
        });

        it("calls logWriter with the correct params", () => {
          loggerService.warn(mockMessage, mockData, mockClassName);

          expect(logWriter.warn).toHaveBeenCalledTimes(1);
          expect(logWriter.warn).toHaveBeenCalledWith(jasmine.stringMatching(`: ${mockClassName} : ${mockMessage}\n${stringifiedMockData}`));
        });
      });

      describe("when logLevel is lower than LogLevel.Warn", () => {
        beforeEach(() => {
          envConfig.logLevel = LogLevel.Error;
          loggerService = new LoggerService(envConfig, logWriterFactory, errorSerializerFactory);
        });

        it("doesn't call logWriter", () => {
          loggerService.warn(mockMessage, mockData, mockClassName);

          expect(logWriter.warn).toHaveBeenCalledTimes(0);
        });
      });
    });
  });

  describe("error", () => {
    describe("under normal conditions", () => {
      describe("when logLevel is LogLevel.Error", () => {
        beforeEach(() => {
          envConfig.logLevel = LogLevel.Error;
          loggerService = new LoggerService(envConfig, logWriterFactory, errorSerializerFactory);
        });

        it("calls logWriter with the correct params", () => {
          loggerService.error(mockMessage, mockData, mockClassName);

          expect(logWriter.error).toHaveBeenCalledTimes(1);
          expect(logWriter.error).toHaveBeenCalledWith(jasmine.stringMatching(`: ${mockClassName} : ${mockMessage}\n${stringifiedMockData}`));
        });
      });

      describe("when logLevel is lower than LogLevel.Error", () => {
        beforeEach(() => {
          envConfig.logLevel = LogLevel.Off;
          loggerService = new LoggerService(envConfig, logWriterFactory, errorSerializerFactory);
        });

        it("doesn't call logWriter", () => {
          loggerService.error(mockMessage, mockData, mockClassName);

          expect(logWriter.error).toHaveBeenCalledTimes(0);
        });
      });
    });
  });

  describe("serialize", () => {
    const mockDataWithErrorValue = { test: new Error("test") };

    describe("under normal conditions", () => {
      describe("when passed a value that is an instance of Error", () => {
        beforeEach(() => {
          envConfig.logLevel = LogLevel.Error;
          loggerService = new LoggerService(envConfig, logWriterFactory, errorSerializerFactory);
        });

        it("calls errorSerializer with the correct params", () => {
          loggerService.error(mockMessage, mockDataWithErrorValue, mockClassName);

          expect(errorSerializer.serializeError).toHaveBeenCalledTimes(1);
          expect(errorSerializer.serializeError).toHaveBeenCalledWith(mockDataWithErrorValue.test);
        });
      });
    });

    describe("under error conditions", () => {
      describe("when errorSerializer.serialize throws an error", () => {
        const mockSerializationError = new Error("test");

        beforeEach(() => {
          envConfig.logLevel = LogLevel.Error;
          errorSerializer.serializeError.and.throwError(mockSerializationError);
          loggerService = new LoggerService(envConfig, logWriterFactory, errorSerializerFactory);
        });

        it("returns '{ \"error\": \"Error serializing data object\" }'", () => {
          loggerService.error(mockMessage, mockDataWithErrorValue, mockClassName);

          expect(logWriter.error).toHaveBeenCalledTimes(1);
          expect(logWriter.error).toHaveBeenCalledWith(jasmine.stringMatching(`: ${mockClassName} : ${mockMessage}\n{ "error": "Error serializing data object" }`));
        });
      });
    });
  });
});
