/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/unbound-method */
import { Record, String, Number, ValidationError } from "runtypes";
import { generateMockRequest, Spied, TestSupport } from "../../test-support";
import { ValidationServiceV2, ValidationServiceV2Interface } from "../validation.service.v2";
import { LoggerService } from "../logger.service";
import { ForbiddenError } from "../../errors";

describe("ValidationServiceV2", () => {
  let loggerService: Spied<LoggerService>;
  let validationService: ValidationServiceV2Interface;

  const dto = Record({
    pathParameters: Record({ a: String }),
    queryStringParameters: Record({ b: String }),
    body: Record({ c: Number }),
  });

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);

    spyOn(dto, "check").and.callThrough();

    validationService = new ValidationServiceV2(loggerService);
  });

  describe("validate", () => {
    describe("under normal conditions", () => {
      const mockUserId = "user-mock-user-id";

      const mockBody = { c: 3 };

      const mockRawRequest = generateMockRequest({
        pathParameters: { a: "a" },
        queryStringParameters: { b: "b" },
        body: JSON.stringify(mockBody),
      }, mockUserId);

      const mockRawRequestWithParsedBody = {
        ...mockRawRequest,
        body: mockBody,
      };

      it("calls dto.validate with the correct parameters", () => {
        validationService.validate({ dto, request: mockRawRequest });

        expect(dto.check).toHaveBeenCalledTimes(1);
        expect(dto.check).toHaveBeenCalledWith(mockRawRequestWithParsedBody);
      });

      describe("when 'getUserIdFromJwt: true' is passed in", () => {
        it("returns a valid response", () => {
          const response = validationService.validate({ dto, request: mockRawRequest, getUserIdFromJwt: true });

          expect(response).toEqual({
            ...mockRawRequestWithParsedBody,
            jwtId: mockUserId,
          } as any);
        });
      });

      describe("when 'getUserIdFromJwt: true' is not passed in", () => {
        it("returns a valid response", () => {
          const response = validationService.validate({ dto, request: mockRawRequest });

          expect(response).toEqual(mockRawRequestWithParsedBody as any);
        });
      });
    });

    describe("under error conditions", () => {
      describe("when a malformed JSON body is passed in", () => {
        const mockRawRequest = generateMockRequest({ body: "{test]" });

        it("throws a ValidationError", () => {
          try {
            validationService.validate({ dto, request: mockRawRequest });

            fail("Expected error");
          } catch (error) {
            expect(error).toBeInstanceOf(ValidationError);
            expect(error.message).toBe("Error parsing body.");
            expect(error.details).toEqual({ body: "Malformed JSON" });
          }
        });
      });

      describe("when 'getUserIdFromJwt: true' is passed in and there is no sub claim", () => {
        const mockRawRequest = generateMockRequest();

        it("throws a ForbiddenError", () => {
          try {
            validationService.validate({ dto, request: mockRawRequest, getUserIdFromJwt: true });

            fail("Expected error");
          } catch (error) {
            expect(error).toBeInstanceOf(ForbiddenError);
            expect(error.message).toBe("Forbidden");
          }
        });
      });

      describe("when passed a request object that is not valid when passed to dto.check", () => {
        const mockRawRequest = generateMockRequest({ body: JSON.stringify({}) });

        it("throws a ValidationError", () => {
          try {
            validationService.validate({ dto, request: mockRawRequest });

            fail("Expected error");
          } catch (error) {
            expect(error).toBeInstanceOf(ValidationError);
            expect(error.details).toEqual({
              pathParameters: { a: "Expected string, but was missing" },
              queryStringParameters: { b: "Expected string, but was missing" },
              body: { c: "Expected number, but was missing" },
            });
          }
        });
      });
    });
  });
});
