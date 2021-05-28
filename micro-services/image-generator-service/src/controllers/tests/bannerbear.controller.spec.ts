import { Spied, TestSupport, LoggerService, ValidationService, Request, BadRequestError, RequestPortion, UnauthorizedError } from "@yac/core";

import { BannerbearController, BannerbearControllerInterface } from "../bannerbear.controller";
import { BannerbearCallbackHeadersDto } from "../../models/bannerbear.callback.input.model";
import { MediaService } from "../../services/media.service";
import { EnvConfigInterface } from "../../config/env.config";

interface BannerbearControllerWithAnyMethod extends BannerbearControllerInterface {
  [key: string]: any;
}

let bannerbearController: BannerbearControllerWithAnyMethod;
let mediaService: Spied<MediaService>;
let loggerService: Spied<LoggerService>;
let validationService: Spied<ValidationService>;
let spyGenerateErrorResponse: jasmine.Spy;
let spyGenerateSuccessResponse: jasmine.Spy;

const mockRequest: Request = { headers: {}, version: "1", routeKey: "route", requestContext: {} as unknown as Request["requestContext"], rawQueryString: "?querystring", rawPath: "rawpath", isBase64Encoded: false };
const mockMediaId = "GROUP-123";
const mockBadRequestError: BadRequestError = new BadRequestError("Invalid");
const envConfig: Pick<EnvConfigInterface, "bannerbear_webhook_key"> = { bannerbear_webhook_key: "right-key-123" };

describe("BannerbearController", () => {
  beforeEach(() => {
    mediaService = TestSupport.spyOnClass(MediaService);
    loggerService = TestSupport.spyOnClass(LoggerService);
    validationService = TestSupport.spyOnClass(ValidationService);
    bannerbearController = new BannerbearController(mediaService, loggerService, envConfig, validationService);
  });

  describe("callback", () => {
    beforeEach(() => {
      spyGenerateErrorResponse = spyOn(bannerbearController, "generateErrorResponse");
      spyGenerateSuccessResponse = spyOn(bannerbearController, "generateSuccessResponse");
    });

    describe("fails correctly", () => {
      it("errors when ValidationService.validate fails", async () => {
        validationService.validate.and.returnValue(Promise.reject(mockBadRequestError));
        try {
          await bannerbearController.callback({ ...mockRequest, body: "test" });
          expect(validationService.validate).toHaveBeenCalledTimes(1);
          expect(validationService.validate).toHaveBeenCalledWith(BannerbearCallbackHeadersDto, RequestPortion.Headers, mockRequest.headers);
          expect(loggerService.error).toHaveBeenCalledWith("Error in callback", { error: mockBadRequestError, request: { ...mockRequest, body: "test" } }, "BannerbearController");
          expect(spyGenerateErrorResponse).toHaveBeenCalledTimes(1);
          expect(spyGenerateErrorResponse).toHaveBeenCalledWith(mockBadRequestError);
        } catch (error: unknown) {
          fail("Should not have errored");
        }
      });

      it("errors when request does not have a body", async () => {
        validationService.validate.and.returnValue(Promise.resolve({ authorization: `Bearer ${envConfig.bannerbear_webhook_key}` }));
        try {
          await bannerbearController.callback({ ...mockRequest });
          expect(validationService.validate).toHaveBeenCalledTimes(1);
          expect(loggerService.error).toHaveBeenCalledWith("Error in callback", { error: new BadRequestError("body is required"), request: mockRequest }, "BannerbearController");
          expect(spyGenerateErrorResponse).toHaveBeenCalledTimes(1);
          expect(spyGenerateErrorResponse).toHaveBeenCalledWith(new BadRequestError("body is required"));
        } catch (error: unknown) {
          fail("Should not have errored");
        }
      });

      it("errors when request authorization key is wrong", async () => {
        validationService.validate.and.returnValue(Promise.resolve({ authorization: "Bearer wrong-key-123" }));
        try {
          await bannerbearController.callback({ ...mockRequest, body: "this is body" });
          expect(validationService.validate).toHaveBeenCalledTimes(1);
          expect(loggerService.error).toHaveBeenCalledWith("Error in callback", { error: new UnauthorizedError(), request: { ...mockRequest, body: "this is body" } }, "BannerbearController");
          expect(spyGenerateErrorResponse).toHaveBeenCalledTimes(1);
          expect(spyGenerateErrorResponse).toHaveBeenCalledWith(new UnauthorizedError());
        } catch (error: unknown) {
          fail("Should not have errored");
        }
      });

      it("errors when metadata is not JSON", async () => {
        validationService.validate.and.returnValue(Promise.resolve({ authorization: `Bearer ${envConfig.bannerbear_webhook_key}`, metadata: "wrong metadata" }));
        try {
          await bannerbearController.callback({ ...mockRequest, body: "this is body" });
          expect(validationService.validate).toHaveBeenCalledTimes(2);
          expect(spyGenerateErrorResponse).toHaveBeenCalledTimes(1);
          expect(spyGenerateErrorResponse).toHaveBeenCalledWith(new BadRequestError("metadata field is not a JSON"));
        } catch (error: unknown) {
          fail("Should not have errored");
        }
      });

      it("errors when metadata.id is not valid", async () => {
        validationService.validate.and.returnValue(Promise.resolve({ authorization: `Bearer ${envConfig.bannerbear_webhook_key}`, metadata: JSON.stringify({ id: "invalid-id" }) }));
        try {
          await bannerbearController.callback({ ...mockRequest, body: "this is body" });
          expect(validationService.validate).toHaveBeenCalledTimes(2);
          expect(spyGenerateErrorResponse).toHaveBeenCalledTimes(1);
          expect(spyGenerateErrorResponse).toHaveBeenCalledWith(new BadRequestError("metadata.id is invalid"));
        } catch (error: unknown) {
          fail("Should not have errored");
        }
      });
    });

    describe("success correctly", () => {
      it("when authorization key is right", async () => {
        validationService.validate.and.returnValue(Promise.resolve({ authorization: `Bearer ${envConfig.bannerbear_webhook_key}`, metadata: JSON.stringify({ id: mockMediaId }) }));
        try {
          await bannerbearController.callback({ ...mockRequest, body: JSON.stringify({ metadata: { id: mockMediaId } }) });
          expect(validationService.validate).toHaveBeenCalledTimes(2);
          expect(spyGenerateSuccessResponse).toHaveBeenCalledTimes(1);
          expect(spyGenerateSuccessResponse).toHaveBeenCalledWith({ message: "Succesfully completed the request. Media is now updated" });
        } catch (error: unknown) {
          fail("Should not have errored");
        }
      });
    });
  });
});
