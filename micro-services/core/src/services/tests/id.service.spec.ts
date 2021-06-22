/* eslint-disable @typescript-eslint/unbound-method */
import ksuid from "ksuid";
import { Ksuid, KsuidFactory } from "../../factories/ksuid.factory";
import { Spied, TestSupport } from "../../test-support";
import { IdService, IdServiceInterface } from "../id.service";
import { LoggerService } from "../logger.service";

describe("IdService", () => {
  let mockKsuid: Spied<Ksuid>;
  const ksuidFactory: KsuidFactory = () => mockKsuid as unknown as Ksuid;
  let loggerService: Spied<LoggerService>;
  let idService: IdServiceInterface;

  const mockId = "mock-id-1234";
  const mockError = new Error("mock error");

  beforeEach(() => {
    mockKsuid = TestSupport.spyOnObject(ksuid);
    loggerService = TestSupport.spyOnClass(LoggerService);

    idService = new IdService(ksuidFactory, loggerService);
  });

  describe("generateId", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        mockKsuid.randomSync.and.returnValue({ string: mockId });
      });

      it("calls loggerService.trace with the correct parameters", () => {
        idService.generateId();

        expect(loggerService.trace).toHaveBeenCalledTimes(1);
        expect(loggerService.trace).toHaveBeenCalledWith("generateId called", {}, idService.constructor.name);
      });

      it("calls ksuid.randomSync", () => {
        idService.generateId();

        expect(mockKsuid.randomSync).toHaveBeenCalledTimes(1);
      });

      it("returns the string returned by ksuid.randomSync", () => {
        const id = idService.generateId();

        expect(id).toBe(mockId);
      });
    });

    describe("under error conditions", () => {
      describe("when ksuid.randomSync throws an error", () => {
        beforeEach(() => {
          mockKsuid.randomSync.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct parameters", () => {
          try {
            const id = idService.generateId();

            fail(`Expected an error, but a value was returned: ${id}`);
          } catch (error: unknown) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in generateId", { error: mockError }, idService.constructor.name);
          }
        });

        it("throws the error", () => {
          try {
            const id = idService.generateId();

            fail(`Expected an error, but a value was returned: ${id}`);
          } catch (error: unknown) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
