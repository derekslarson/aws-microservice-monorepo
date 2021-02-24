import { LogLevel } from "../../enums/logLevel.enum";
import { ErrorSerializer, ErrorSerializerFactory } from "../../factories/errorSerializer.factory";
import { LogWriter, LogWriterFactory } from "../../factories/logWriter.factory";
import { ISO_DATE_REGEX } from "../../test-support/iso.date.regex";
import { LoggerServiceConfigInterface, LoggerServiceInterface, LoggerService } from "../logger.service";

describe("LoggerService", () => {
  const envConfig: LoggerServiceConfigInterface = { logLevel: LogLevel.Trace };
  let logWriter: LogWriter;
  let errorSerializer: ErrorSerializer;
  let loggerService: LoggerServiceInterface;

  const logWriterFactory: LogWriterFactory = () => logWriter;
  const errorSerializerFactory: ErrorSerializerFactory = () => errorSerializer;

  const mockMessage = "mock logging message";
  const mockData = { mock: "data" };
  const stringifiedMockData = JSON.stringify(mockData, null, 2);
  const mockClassName = "MockClass";
  const mockSerializedError = "{}";
  const mockError = new Error("Mock Error");

  beforeEach(() => {
    logWriter = jasmine.createSpy("logWriter");
    errorSerializer = {
      serializeError: jasmine.createSpy("serializeError").and.returnValue(mockSerializedError),
      deserializeError: jasmine.createSpy("deserializeError").and.returnValue(mockError),
    };
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

          expect(logWriter).toHaveBeenCalledTimes(1);
          expect(logWriter).toHaveBeenCalledWith(jasmine.stringMatching(ISO_DATE_REGEX));
          expect(logWriter).toHaveBeenCalledWith(jasmine.stringMatching(` : TRACE : ${mockClassName} : ${mockMessage}\n${stringifiedMockData}`));
        });

        it("doesnt call errorSerializer", () => {

        });
      });

      describe("when logLevel is lower than LogLevel.Trace", () => {
        beforeEach(() => {
          envConfig.logLevel = LogLevel.Info;
          loggerService = new LoggerService(envConfig, logWriterFactory, errorSerializerFactory);
        });

        it("doesn't call logWriter", () => {
          loggerService.trace(mockMessage, mockData, mockClassName);

          expect(logWriter).toHaveBeenCalledTimes(0);
        });
      });
    });

    describe("under error conditions", () => {

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

          expect(logWriter).toHaveBeenCalledTimes(1);
          expect(logWriter).toHaveBeenCalledWith(jasmine.stringMatching(ISO_DATE_REGEX));
          expect(logWriter).toHaveBeenCalledWith(jasmine.stringMatching(` : INFO : ${mockClassName} : ${mockMessage}\n${stringifiedMockData}`));
        });
      });

      describe("when logLevel is lower than LogLevel.Info", () => {
        beforeEach(() => {
          envConfig.logLevel = LogLevel.Warn;
          loggerService = new LoggerService(envConfig, logWriterFactory, errorSerializerFactory);
        });

        it("doesn't call logWriter", () => {
          loggerService.info(mockMessage, mockData, mockClassName);

          expect(logWriter).toHaveBeenCalledTimes(0);
        });
      });
    });

    describe("under error conditions", () => {

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

          expect(logWriter).toHaveBeenCalledTimes(1);
          expect(logWriter).toHaveBeenCalledWith(jasmine.stringMatching(ISO_DATE_REGEX));
          expect(logWriter).toHaveBeenCalledWith(jasmine.stringMatching(` : WARN : ${mockClassName} : ${mockMessage}\n${stringifiedMockData}`));
        });
      });

      describe("when logLevel is lower than LogLevel.Warn", () => {
        beforeEach(() => {
          envConfig.logLevel = LogLevel.Error;
          loggerService = new LoggerService(envConfig, logWriterFactory, errorSerializerFactory);
        });

        it("doesn't call logWriter", () => {
          loggerService.warn(mockMessage, mockData, mockClassName);

          expect(logWriter).toHaveBeenCalledTimes(0);
        });
      });
    });

    describe("under error conditions", () => {

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

          expect(logWriter).toHaveBeenCalledTimes(1);
          expect(logWriter).toHaveBeenCalledWith(jasmine.stringMatching(ISO_DATE_REGEX));
          expect(logWriter).toHaveBeenCalledWith(jasmine.stringMatching(` : ERROR : ${mockClassName} : ${mockMessage}\n${stringifiedMockData}`));
        });
      });

      describe("when logLevel is lower than LogLevel.Error", () => {
        beforeEach(() => {
          envConfig.logLevel = LogLevel.Off;
          loggerService = new LoggerService(envConfig, logWriterFactory, errorSerializerFactory);
        });

        it("doesn't call logWriter", () => {
          loggerService.error(mockMessage, mockData, mockClassName);

          expect(logWriter).toHaveBeenCalledTimes(0);
        });
      });
    });

    describe("under error conditions", () => {

    });
  });
});
