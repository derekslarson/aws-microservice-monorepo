/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, ValidationServiceV2Interface, ValidationServiceV2, generateMockRequest, ForbiddenError } from "@yac/util";
import { RegisterDeviceDto } from "../../dtos/registerDevice.dto";
import { PushNotificationMediatorService, PushNotificationMediatorServiceInterface } from "../../mediator-services/pushNotification.mediator.service";
import { PushNotificationController, PushNotificationControllerInterface } from "../pushNotification.controller";

interface PushNotificationControllerWithAnyMethod extends PushNotificationControllerInterface {
  [key: string]: any;
}

describe("PushNotificationController", () => {
  let loggerService: Spied<LoggerService>;
  let validationService: Spied<ValidationServiceV2Interface>;
  let pushNotificationMediatorService: Spied<PushNotificationMediatorServiceInterface>;
  let pushNotificationController: PushNotificationControllerWithAnyMethod;

  const mockUserId = "mock-user-id";
  const mockDeviceId = "mock-device-id";
  const mockDeviceToken = "mock-token";
  const mockError = new Error("test");
  const mockSuccessResponse = { mock: "success-response" };
  const mockErrorResponse = { mock: "error-response" };

  beforeEach(() => {
    validationService = TestSupport.spyOnClass(ValidationServiceV2);
    loggerService = TestSupport.spyOnClass(LoggerService);
    pushNotificationMediatorService = TestSupport.spyOnClass(PushNotificationMediatorService);

    pushNotificationController = new PushNotificationController(validationService, pushNotificationMediatorService, loggerService);
  });

  describe("registerDevice", () => {
    const mockRequest = generateMockRequest();

    const mockValidatedRequest = {
      jwtId: mockUserId,
      pathParameters: { userId: mockUserId },
      body: { id: mockDeviceId, token: mockDeviceToken },
    };

    describe("under normal conditions", () => {
      beforeEach(() => {
        validationService.validate.and.returnValue(mockValidatedRequest);
        pushNotificationMediatorService.registerDevice.and.returnValue(Promise.resolve());
        spyOn(pushNotificationController, "generateSuccessResponse").and.returnValue(mockSuccessResponse);
      });

      it("calls validationService.validate with the correct params", async () => {
        await pushNotificationController.registerDevice(mockRequest);

        expect(validationService.validate).toHaveBeenCalledTimes(1);
        expect(validationService.validate).toHaveBeenCalledWith({ dto: RegisterDeviceDto, request: mockRequest, getUserIdFromJwt: true });
      });

      it("calls pushNotificationMediatorService.registerDevice with the correct params", async () => {
        await pushNotificationController.registerDevice(mockRequest);

        expect(pushNotificationMediatorService.registerDevice).toHaveBeenCalledTimes(1);
        expect(pushNotificationMediatorService.registerDevice).toHaveBeenCalledWith({ userId: mockUserId, deviceId: mockDeviceId, deviceToken: mockDeviceToken });
      });

      it("calls this.generateSuccessResponse with the correct params", async () => {
        await pushNotificationController.registerDevice(mockRequest);

        expect(pushNotificationController.generateSuccessResponse).toHaveBeenCalledTimes(1);
        expect(pushNotificationController.generateSuccessResponse).toHaveBeenCalledWith({ message: "Device registered" });
      });

      it("returns the response of this.generateSuccessResponse", async () => {
        const response = await pushNotificationController.registerDevice(mockRequest);

        expect(response).toBe(mockSuccessResponse);
      });
    });

    describe("under error conditions", () => {
      describe("when the userId in the path doesn't match the userId in the access token", () => {
        beforeEach(() => {
          validationService.validate.and.returnValue({ ...mockValidatedRequest, jwtId: "test" });
          spyOn(pushNotificationController, "generateErrorResponse").and.returnValue(mockErrorResponse);
        });

        it("it throws a ForbiddenError", async () => {
          await pushNotificationController.registerDevice(mockRequest);

          expect(pushNotificationController.generateErrorResponse).toHaveBeenCalledWith(new ForbiddenError("Forbidden"));
        });
      });

      describe("when validationService.validate throws an error", () => {
        beforeEach(() => {
          validationService.validate.and.throwError(mockError);
          spyOn(pushNotificationController, "generateErrorResponse").and.returnValue(mockErrorResponse);
        });

        it("calls loggerService.error with the correct params", async () => {
          await pushNotificationController.registerDevice(mockRequest);

          expect(loggerService.error).toHaveBeenCalledTimes(1);
          expect(loggerService.error).toHaveBeenCalledWith("Error in registerDevice", { error: mockError, request: mockRequest }, pushNotificationController.constructor.name);
        });

        it("calls this.generateErrorResponse with the correct params", async () => {
          await pushNotificationController.registerDevice(mockRequest);

          expect(pushNotificationController.generateErrorResponse).toHaveBeenCalledTimes(1);
          expect(pushNotificationController.generateErrorResponse).toHaveBeenCalledWith(mockError);
        });

        it("returns the response of this.generateErrorResponse", async () => {
          const response = await pushNotificationController.registerDevice(mockRequest);

          expect(response).toEqual(mockErrorResponse);
        });
      });
    });
  });
});
