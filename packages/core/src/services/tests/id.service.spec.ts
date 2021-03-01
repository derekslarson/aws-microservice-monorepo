import { UuidV4, UuidV4Factory } from "../../factories/uuidV4.factory";
import { Spied, TestSupport } from "../../test-support";
import { IdService, IdServiceInterface } from "../id.service";
import { LoggerService } from "../logger.service";

describe("IdService", () => {
  let uuidV4: UuidV4;
  const uuidV4Factory: UuidV4Factory = () => uuidV4;
  let loggerService: Spied<LoggerService>;
  let idService: IdServiceInterface;

  const mockId = "mock-id-1234";
  const mockError = new Error("mock error");

  beforeEach(() => {
    uuidV4 = jasmine.createSpy("uuidV4").and.returnValue(mockId);
    loggerService = TestSupport.spyOnClass(LoggerService);
    idService = new IdService(uuidV4Factory, loggerService);
  });

  describe("generateId", () => {
    describe("under normal conditions", () => {
      it("calls loggerService.trace with the correct parameters", () => {
        idService.generateId();

        expect(loggerService.trace).toHaveBeenCalledTimes(1);
        expect(loggerService.trace).toHaveBeenCalledWith("generateId called", {}, idService.constructor.name);
      });

      it("calls uuidV4", () => {
        idService.generateId();

        expect(uuidV4).toHaveBeenCalledTimes(1);
      });

      it("returns the string returned by uuidV4", () => {
        const id = idService.generateId();

        expect(id).toBe(mockId);
      });
    });

    describe("under error conditions", () => {
      describe("when uuidV4 throws an error", () => {
        beforeEach(() => {
          uuidV4 = () => {
            throw mockError;
          };

          idService = new IdService(uuidV4Factory, loggerService);
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
