/* eslint-disable @typescript-eslint/unbound-method */
import { BaseController } from "../base.controller";
import { Body } from "../../models/http/response.model";
import { StatusCode } from "../../enums/statusCode.enum";
import { NotFoundError } from "../../errors/notFound.error";
import { ForbiddenError } from "../../errors/forbidden.error";
import { UnauthorizedError } from "../../errors/unauthorized.error";
import { RequestValidationError } from "../../errors/request.validation.error";
import { RequestPortion } from "../../enums/request.portion.enum";
import { BadRequestError } from "../../errors/badRequest.error";
import { Request } from "../../models/http/request.model";
import { generateMockRequest } from "../../test-support/generateMockRequest";

// Need to extend the abstract class and expose its protected methods in order to test them
class TestController extends BaseController {
  public getUserIdFromRequestWithJwt(request: Request) {
    return super.getUserIdFromRequestWithJwt(request);
  }

  public generateSuccessResponse(body: Body | string, headers?: Record<string, string>, cookies?: string[]) {
    return super.generateSuccessResponse(body, headers, cookies);
  }

  public generateCreatedResponse(body: Body, headers?: Record<string, string>, cookies?: string[]) {
    return super.generateCreatedResponse(body, headers, cookies);
  }

  public generateFoundResponse(redirectLocation: string, otherHeaders?: Record<string, string>, cookies?: string[]) {
    return super.generateFoundResponse(redirectLocation, otherHeaders, cookies);
  }

  public generateSeeOtherResponse(redirectLocation: string, otherHeaders?: Record<string, string>, cookies?: string[]) {
    return super.generateSeeOtherResponse(redirectLocation, otherHeaders, cookies);
  }

  public generateErrorResponse(error: unknown) {
    return super.generateErrorResponse(error);
  }
}

describe("BaseController", () => {
  let testController: TestController;

  const mockBody = { foo: "bar" };
  const mockHeaders = { cat: "dog" };
  const mockCookies = [ "chocolate=chip" ];
  const mockRedirectLocation = "https://www.pants.com";

  beforeEach(() => {
    spyOn(JSON, "stringify").and.callThrough();

    testController = new TestController();
  });

  describe("getUserIdFromRequestWithJwt", () => {
    const mockRawUserId = "mockUserId";
    describe("under normal conditions", () => {
      const mockRequest = generateMockRequest();
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      mockRequest.requestContext.authorizer?.jwt.claims.sub = mockRawUserId;

      it("returns the sub claim in the request context's jwt, formatted correctly", () => {
        const userId = testController.getUserIdFromRequestWithJwt(mockRequest);

        expect(userId).toBe(`USER-${mockRawUserId}`);
      });
    });

    describe("under error conditons", () => {
      describe("when the request doesn't have an authorizer prop", () => {
        const mockRequest = generateMockRequest();
        delete mockRequest.requestContext.authorizer;

        it("throws a forbidden error", () => {
          try {
            testController.getUserIdFromRequestWithJwt(mockRequest);

            fail("Expected to throw");
          } catch (error) {
            expect(error).toBeInstanceOf(ForbiddenError);
            expect((error as ForbiddenError).message).toBe("Forbidden");
          }
        });
      });

      describe("when the jwt token doesn't contain a sub claim", () => {
        const mockRequest = generateMockRequest();

        it("throws a forbidden error", () => {
          try {
            testController.getUserIdFromRequestWithJwt(mockRequest);

            fail("Expected to throw");
          } catch (error) {
            expect(error).toBeInstanceOf(ForbiddenError);
            expect((error as ForbiddenError).message).toBe("Forbidden");
          }
        });
      });
    });
  });

  describe("generateSuccessResponse", () => {
    describe("under normal conditions", () => {
      it("calls JSON.stringify with the correct parameters", () => {
        testController.generateSuccessResponse(mockBody);

        expect(JSON.stringify).toHaveBeenCalledTimes(1);
        expect(JSON.stringify).toHaveBeenCalledWith(mockBody);
      });

      describe("when only passed a body", () => {
        it("returns the expected format", () => {
          const response = testController.generateSuccessResponse(mockBody);

          expect(response).toEqual({
            statusCode: StatusCode.OK,
            headers: {},
            cookies: [],
            body: JSON.stringify(mockBody),
          });
        });
      });

      describe("when passed a body and headers", () => {
        it("returns the expected format", () => {
          const response = testController.generateSuccessResponse(mockBody, mockHeaders);

          expect(response).toEqual({
            statusCode: StatusCode.OK,
            headers: mockHeaders,
            cookies: [],
            body: JSON.stringify(mockBody),
          });
        });
      });

      describe("when passed a body, headers and cookies", () => {
        it("returns the expected format", () => {
          const response = testController.generateSuccessResponse(mockBody, mockHeaders, mockCookies);

          expect(response).toEqual({
            statusCode: StatusCode.OK,
            headers: mockHeaders,
            cookies: mockCookies,
            body: JSON.stringify(mockBody),
          });
        });
      });
    });
  });

  describe("generateCreatedResponse", () => {
    describe("under normal conditions", () => {
      it("calls JSON.stringify with the correct parameters", () => {
        testController.generateCreatedResponse(mockBody);

        expect(JSON.stringify).toHaveBeenCalledTimes(1);
        expect(JSON.stringify).toHaveBeenCalledWith(mockBody);
      });

      describe("when only passed a body", () => {
        it("returns the expected format", () => {
          const response = testController.generateCreatedResponse(mockBody);

          expect(response).toEqual({
            statusCode: StatusCode.Created,
            headers: {},
            cookies: [],
            body: JSON.stringify(mockBody),
          });
        });
      });

      describe("when passed a body and headers", () => {
        it("returns the expected format", () => {
          const response = testController.generateCreatedResponse(mockBody, mockHeaders);

          expect(response).toEqual({
            statusCode: StatusCode.Created,
            headers: mockHeaders,
            cookies: [],
            body: JSON.stringify(mockBody),
          });
        });
      });

      describe("when passed a body, headers and cookies", () => {
        it("returns the expected format", () => {
          const response = testController.generateCreatedResponse(mockBody, mockHeaders, mockCookies);

          expect(response).toEqual({
            statusCode: StatusCode.Created,
            headers: mockHeaders,
            cookies: mockCookies,
            body: JSON.stringify(mockBody),
          });
        });
      });
    });
  });

  describe("generateFoundResponse", () => {
    describe("under normal conditions", () => {
      describe("when only passed a redirectLocation", () => {
        it("returns the expected format", () => {
          const response = testController.generateFoundResponse(mockRedirectLocation);

          expect(response).toEqual({
            statusCode: StatusCode.Found,
            headers: { Location: mockRedirectLocation },
            cookies: [],
          });
        });
      });

      describe("when passed a redirectLocation and headers", () => {
        it("returns the expected format", () => {
          const response = testController.generateFoundResponse(mockRedirectLocation, mockHeaders);

          expect(response).toEqual({
            statusCode: StatusCode.Found,
            headers: { Location: mockRedirectLocation, ...mockHeaders },
            cookies: [],
          });
        });
      });

      describe("when passed a redirectLocation, headers and cookies", () => {
        it("returns the expected format", () => {
          const response = testController.generateFoundResponse(mockRedirectLocation, mockHeaders, mockCookies);

          expect(response).toEqual({
            statusCode: StatusCode.Found,
            headers: { Location: mockRedirectLocation, ...mockHeaders },
            cookies: mockCookies,
          });
        });
      });
    });
  });

  describe("generateSeeOtherResponse", () => {
    describe("under normal conditions", () => {
      describe("when only passed a redirectLocation", () => {
        it("returns the expected format", () => {
          const response = testController.generateSeeOtherResponse(mockRedirectLocation);

          expect(response).toEqual({
            statusCode: StatusCode.SeeOther,
            headers: { Location: mockRedirectLocation },
            cookies: [],
          });
        });
      });

      describe("when passed a redirectLocation and headers", () => {
        it("returns the expected format", () => {
          const response = testController.generateSeeOtherResponse(mockRedirectLocation, mockHeaders);

          expect(response).toEqual({
            statusCode: StatusCode.SeeOther,
            headers: { Location: mockRedirectLocation, ...mockHeaders },
            cookies: [],
          });
        });
      });

      describe("when passed a redirectLocation, headers and cookies", () => {
        it("returns the expected format", () => {
          const response = testController.generateSeeOtherResponse(mockRedirectLocation, mockHeaders, mockCookies);

          expect(response).toEqual({
            statusCode: StatusCode.SeeOther,
            headers: { Location: mockRedirectLocation, ...mockHeaders },
            cookies: mockCookies,
          });
        });
      });
    });
  });

  describe("generateErrorResponse", () => {
    describe("under normal conditions", () => {
      describe("when passed a NotFoundError", () => {
        const mockNotFoundError = new NotFoundError("mock not found errror");

        it("returns the expected format", () => {
          const response = testController.generateErrorResponse(mockNotFoundError);

          expect(response).toEqual({
            statusCode: StatusCode.NotFound,
            body: JSON.stringify({ message: mockNotFoundError.message }),
          });
        });
      });

      describe("when passed a ForbiddenError", () => {
        const mockForbiddenError = new ForbiddenError("mock forbidden errror");

        it("returns the expected format", () => {
          const response = testController.generateErrorResponse(mockForbiddenError);

          expect(response).toEqual({
            statusCode: StatusCode.Forbidden,
            body: JSON.stringify({ message: mockForbiddenError.message }),
          });
        });
      });

      describe("when passed an UnauthorizedError", () => {
        const mockUnauthorizedError = new UnauthorizedError("mock unauthorized errror");

        it("returns the expected format", () => {
          const response = testController.generateErrorResponse(mockUnauthorizedError);

          expect(response).toEqual({
            statusCode: StatusCode.Unauthorized,
            body: JSON.stringify({ message: mockUnauthorizedError.message }),
          });
        });
      });

      describe("when passed a RequestValidationError", () => {
        const mockRequestPortion = RequestPortion.Body;
        const mockValidationErrors = [
          { property: "pants", value: "jeans", issues: [ "faded" ] },
        ];

        const mockRequestValidationError = new RequestValidationError(mockRequestPortion, mockValidationErrors);

        it("returns the expected format", () => {
          const response = testController.generateErrorResponse(mockRequestValidationError);

          expect(response).toEqual({
            statusCode: StatusCode.BadRequest,
            body: JSON.stringify({
              message: mockRequestValidationError.message,
              validationErrors: mockValidationErrors,
            }),
          });
        });
      });

      describe("when passed a BadRequestError", () => {
        const mockBadRequestError = new BadRequestError("mock bad request error");

        it("returns the expected format", () => {
          const response = testController.generateErrorResponse(mockBadRequestError);

          expect(response).toEqual({
            statusCode: StatusCode.BadRequest,
            body: JSON.stringify({ message: mockBadRequestError.message }),
          });
        });
      });

      describe("when passed an unexpected error", () => {
        const mockRandomtError = new Error("random error");

        it("returns the expected format", () => {
          const response = testController.generateErrorResponse(mockRandomtError);

          expect(response).toEqual({
            statusCode: StatusCode.InternalServerError,
            body: JSON.stringify({ message: "An unexpected error occurred." }),
          });
        });
      });
    });
  });
});
