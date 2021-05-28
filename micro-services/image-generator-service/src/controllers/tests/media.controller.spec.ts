import { Spied, TestSupport, LoggerService, ValidationService, Request, BadRequestError, RequestPortion } from "@yac/core";

import { MediaController, MediaControllerInterface } from "../media.controller";
import { MediaService } from "../../services/media.service";
import { MediaPushQueryParametersDto, MediaPushPathParametersDto } from "../../models/media.push.input.model";
import { MediaRetrieveQueryParametersDto, MediaRetrievePathParametersDto } from "../../models/media.retrieve.input.model";

interface MediaControllerWithAnyMethod extends MediaControllerInterface {
  [key: string]: any;
}

let mediaController: MediaControllerWithAnyMethod;
let mediaService: Spied<MediaService>;
let loggerService: Spied<LoggerService>;
let validationService: Spied<ValidationService>;
let spyGenerateErrorResponse: jasmine.Spy;
let spyGenerateSuccessResponse: jasmine.Spy;
let spyGenerateFoundResponse: jasmine.Spy;

const mockRequest: Request = { headers: {}, version: "1", routeKey: "route", requestContext: {} as unknown as Request["requestContext"], rawQueryString: "?querystring", rawPath: "rawpath", isBase64Encoded: false };
const mockMessageId = 123;
const mockFolder = "user";
const mockToken = "token-123";
const mockBadRequestError: BadRequestError = new BadRequestError("Invalid");
const mockMediaUrl = "media-url";

function validationServiceMockFactory(failWith: RequestPortion, resolveWith?: any) {
  return (...args: any[]) => {
    const type = args[1] as RequestPortion;
    if (type === failWith) {
      return Promise.reject(mockBadRequestError);
    }

    return Promise.resolve(resolveWith || {});
  };
}

describe("BannerbearController", () => {
  beforeEach(() => {
    mediaService = TestSupport.spyOnClass(MediaService);
    loggerService = TestSupport.spyOnClass(LoggerService);
    validationService = TestSupport.spyOnClass(ValidationService);
    mediaController = new MediaController(mediaService, loggerService, validationService);

    spyGenerateErrorResponse = spyOn(mediaController, "generateErrorResponse");
    spyGenerateSuccessResponse = spyOn(mediaController, "generateSuccessResponse");
    spyGenerateFoundResponse = spyOn(mediaController, "generateFoundResponse");
  });

  describe("pushTask", () => {
    describe("fails correctly", () => {
      it("fails when ValidationService.validate:RequestProtion.QueryParameters errors", async () => {
        validationService.validate.and.callFake(validationServiceMockFactory(RequestPortion.QueryParameters));
        try {
          await mediaController.pushMedia(mockRequest);
          expect(validationService.validate).toHaveBeenCalledTimes(1);
          expect(validationService.validate).toHaveBeenCalledWith(MediaPushQueryParametersDto, RequestPortion.QueryParameters, mockRequest.queryStringParameters);
          expect(loggerService.error).toHaveBeenCalledWith("Error in pushMedia", { error: mockBadRequestError, request: mockRequest }, "MediaController");
          expect(spyGenerateErrorResponse).toHaveBeenCalledTimes(1);
          expect(spyGenerateErrorResponse).toHaveBeenCalledWith(mockBadRequestError);
        } catch (error: unknown) {
          fail("Should not have errored");
        }
      });

      it("fails when ValidationService.validate:RequestProtion.PathParameters errors", async () => {
        validationService.validate.and.callFake(validationServiceMockFactory(RequestPortion.PathParameters));
        try {
          await mediaController.pushMedia(mockRequest);
          expect(validationService.validate).toHaveBeenCalledTimes(2);
          expect(validationService.validate).toHaveBeenCalledWith(MediaPushQueryParametersDto, RequestPortion.QueryParameters, mockRequest.queryStringParameters);
          expect(validationService.validate).toHaveBeenCalledWith(MediaPushPathParametersDto, RequestPortion.PathParameters, mockRequest.pathParameters);
          expect(loggerService.error).toHaveBeenCalledWith("Error in pushMedia", { error: mockBadRequestError, request: mockRequest }, "MediaController");
          expect(spyGenerateErrorResponse).toHaveBeenCalledTimes(1);
          expect(spyGenerateErrorResponse).toHaveBeenCalledWith(mockBadRequestError);
        } catch (error: unknown) {
          fail("Should not have errored");
        }
      });
    });
    describe("success correctly", () => {
      it("pushes a media task", async () => {
        validationService.validate.and.returnValue({ messageId: mockMessageId, folder: mockFolder, token: mockToken });
        mediaService.createMedia.and.returnValue({ id: `${mockFolder}-${mockMessageId}` });
        try {
          await mediaController.pushMedia(mockRequest);
          expect(validationService.validate).toHaveBeenCalledTimes(2);
          expect(validationService.validate).toHaveBeenCalledWith(MediaPushQueryParametersDto, RequestPortion.QueryParameters, mockRequest.queryStringParameters);
          expect(validationService.validate).toHaveBeenCalledWith(MediaPushPathParametersDto, RequestPortion.PathParameters, mockRequest.pathParameters);
          expect(mediaService.createMedia).toHaveBeenCalledTimes(1);
          expect(mediaService.createMedia).toHaveBeenCalledWith(mockMessageId, false, mockToken);
          expect(spyGenerateSuccessResponse).toHaveBeenCalledTimes(1);
          expect(spyGenerateSuccessResponse).toHaveBeenCalledWith({ id: `${mockFolder}-${mockMessageId}` });
        } catch (error: unknown) {
          fail("Should not have errored");
        }
      });
    });
  });

  describe("retrieveMedia", () => {
    describe("fails correctly", () => {
      it("fails when ValidationService.validate:RequestProtion.QueryParameters errors", async () => {
        validationService.validate.and.callFake(validationServiceMockFactory(RequestPortion.QueryParameters));
        try {
          await mediaController.retrieveMedia(mockRequest);
          expect(validationService.validate).toHaveBeenCalledTimes(1);
          expect(validationService.validate).toHaveBeenCalledWith(MediaRetrieveQueryParametersDto, RequestPortion.QueryParameters, mockRequest.queryStringParameters);
          expect(loggerService.error).toHaveBeenCalledWith("Error in retrieveMedia", { error: mockBadRequestError, request: mockRequest }, "MediaController");
          expect(spyGenerateErrorResponse).toHaveBeenCalledTimes(1);
          expect(spyGenerateErrorResponse).toHaveBeenCalledWith(mockBadRequestError);
        } catch (error: unknown) {
          fail("Should not have errored");
        }
      });

      it("fails when ValidationService.validate:RequestProtion.PathParameters errors", async () => {
        validationService.validate.and.callFake(validationServiceMockFactory(RequestPortion.PathParameters));
        try {
          await mediaController.retrieveMedia(mockRequest);
          expect(validationService.validate).toHaveBeenCalledTimes(2);
          expect(validationService.validate).toHaveBeenCalledWith(MediaRetrieveQueryParametersDto, RequestPortion.QueryParameters, mockRequest.queryStringParameters);
          expect(validationService.validate).toHaveBeenCalledWith(MediaRetrievePathParametersDto, RequestPortion.PathParameters, mockRequest.pathParameters);
          expect(loggerService.error).toHaveBeenCalledWith("Error in retrieveMedia", { error: mockBadRequestError, request: mockRequest }, "MediaController");
          expect(spyGenerateErrorResponse).toHaveBeenCalledTimes(1);
          expect(spyGenerateErrorResponse).toHaveBeenCalledWith(mockBadRequestError);
        } catch (error: unknown) {
          fail("Should not have errored");
        }
      });
    });
    describe("success correctly", () => {
      it("pushes a media task", async () => {
        validationService.validate.and.returnValue({ messageId: mockMessageId, folder: mockFolder, token: mockToken });
        mediaService.getMedia.and.returnValue({ url: mockMediaUrl });
        try {
          await mediaController.retrieveMedia(mockRequest);
          expect(validationService.validate).toHaveBeenCalledTimes(2);
          expect(validationService.validate).toHaveBeenCalledWith(MediaRetrieveQueryParametersDto, RequestPortion.QueryParameters, mockRequest.queryStringParameters);
          expect(validationService.validate).toHaveBeenCalledWith(MediaRetrievePathParametersDto, RequestPortion.PathParameters, mockRequest.pathParameters);
          expect(mediaService.getMedia).toHaveBeenCalledTimes(1);
          expect(mediaService.getMedia).toHaveBeenCalledWith(mockMessageId, false, mockToken);
          expect(spyGenerateFoundResponse).toHaveBeenCalledTimes(1);
          expect(spyGenerateFoundResponse).toHaveBeenCalledWith(mockMediaUrl);
        } catch (error: unknown) {
          fail("Should not have errored");
        }
      });
    });
  });
});
