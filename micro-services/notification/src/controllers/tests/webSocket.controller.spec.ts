/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, ValidationServiceV2Interface, ValidationServiceV2, generateMockRequest } from "@yac/util";
import { ConnectDto } from "../../dtos/connect.dto";
import { DisconnectDto } from "../../dtos/disconnect.dto";
import { WebSocketMediatorService, WebSocketMediatorServiceInterface } from "../../mediator-services/webSocket.mediator.service";
import { TokenVerificationService, TokenVerificationServiceInterface } from "../../services/tokenVerification.service";
import { WebSocketController, WebSocketControllerInterface } from "../webSocket.controller";

interface WebSocketControllerWithAnyMethod extends WebSocketControllerInterface {
  [key: string]: any;
}

describe("WebSocketController", () => {
  let loggerService: Spied<LoggerService>;
  let validationService: Spied<ValidationServiceV2Interface>;
  let tokenVerificationService: Spied<TokenVerificationServiceInterface>;
  let webSocketMediatorService: Spied<WebSocketMediatorServiceInterface>;
  let webSocketController: WebSocketControllerWithAnyMethod;

  const mockUserId = "mock-user-id";
  const mockToken = "mock-token";
  const mockConnectionId = "mock-connection-id";
  const mockError = new Error("test");
  const mockErrorResponse = { statusCode: 500 };

  beforeEach(() => {
    validationService = TestSupport.spyOnClass(ValidationServiceV2);
    tokenVerificationService = TestSupport.spyOnClass(TokenVerificationService);
    loggerService = TestSupport.spyOnClass(LoggerService);
    webSocketMediatorService = TestSupport.spyOnClass(WebSocketMediatorService);

    webSocketController = new WebSocketController(validationService, tokenVerificationService, loggerService, webSocketMediatorService);
  });

  describe("connect", () => {
    const mockRequest = generateMockRequest();

    const mockValidatedRequest = { queryStringParameters: { token: mockToken }, requestContext: { connectionId: mockConnectionId } };

    describe("under normal conditions", () => {
      beforeEach(() => {
        validationService.validate.and.returnValue(mockValidatedRequest);
        tokenVerificationService.verifyToken.and.returnValue(Promise.resolve({ decodedToken: { username: mockUserId } }));
        webSocketMediatorService.persistConnectionId.and.returnValue(Promise.resolve());
      });

      it("calls validationService.validate with the correct params", async () => {
        await webSocketController.connect(mockRequest);

        expect(validationService.validate).toHaveBeenCalledTimes(1);
        expect(validationService.validate).toHaveBeenCalledWith({ dto: ConnectDto, request: mockRequest });
      });

      it("calls tokenVerificationService.verifyToken with the correct params", async () => {
        await webSocketController.connect(mockRequest);

        expect(tokenVerificationService.verifyToken).toHaveBeenCalledTimes(1);
        expect(tokenVerificationService.verifyToken).toHaveBeenCalledWith({ token: mockToken });
      });

      it("calls webSocketMediatorService.persistConnectionId with the correct params", async () => {
        await webSocketController.connect(mockRequest);

        expect(webSocketMediatorService.persistConnectionId).toHaveBeenCalledTimes(1);
        expect(webSocketMediatorService.persistConnectionId).toHaveBeenCalledWith({ userId: mockUserId, connectionId: mockConnectionId });
      });

      it("returns a valid response", async () => {
        const response = await webSocketController.connect(mockRequest);

        expect(response).toEqual({ statusCode: 200 });
      });
    });

    describe("under error conditions", () => {
      describe("when validationService.validate throws an error", () => {
        beforeEach(() => {
          validationService.validate.and.throwError(mockError);
          spyOn(webSocketController, "generateErrorResponse").and.returnValue(mockErrorResponse);
        });

        it("calls loggerService.error with the correct params", async () => {
          await webSocketController.connect(mockRequest);

          expect(loggerService.error).toHaveBeenCalledTimes(1);
          expect(loggerService.error).toHaveBeenCalledWith("Error in connect", { error: mockError, request: mockRequest }, webSocketController.constructor.name);
        });

        it("calls this.generateErrorResponse with the correct params", async () => {
          await webSocketController.connect(mockRequest);

          expect(webSocketController.generateErrorResponse).toHaveBeenCalledTimes(1);
          expect(webSocketController.generateErrorResponse).toHaveBeenCalledWith(mockError);
        });

        it("returns the response of this.generateErrorResponse", async () => {
          const response = await webSocketController.disconnect(mockRequest);

          expect(response).toEqual(mockErrorResponse);
        });
      });
    });
  });

  describe("disconnect", () => {
    const mockRequest = generateMockRequest();

    const mockValidatedRequest = { requestContext: { connectionId: mockConnectionId } };

    describe("under normal conditions", () => {
      beforeEach(() => {
        validationService.validate.and.returnValue(mockValidatedRequest);
        webSocketMediatorService.deleteConnectionId.and.returnValue(Promise.resolve());
      });

      it("calls validationService.validate with the correct params", async () => {
        await webSocketController.disconnect(mockRequest);

        expect(validationService.validate).toHaveBeenCalledTimes(1);
        expect(validationService.validate).toHaveBeenCalledWith({ dto: DisconnectDto, request: mockRequest });
      });

      it("calls webSocketMediatorService.deleteConnectionId with the correct params", async () => {
        await webSocketController.disconnect(mockRequest);

        expect(webSocketMediatorService.deleteConnectionId).toHaveBeenCalledTimes(1);
        expect(webSocketMediatorService.deleteConnectionId).toHaveBeenCalledWith({ connectionId: mockConnectionId });
      });

      it("returns a valid response", async () => {
        const response = await webSocketController.disconnect(mockRequest);

        expect(response).toEqual({ statusCode: 200 });
      });
    });

    describe("under error conditions", () => {
      describe("when validationService.validate throws an error", () => {
        beforeEach(() => {
          validationService.validate.and.throwError(mockError);
          spyOn(webSocketController, "generateErrorResponse").and.returnValue(mockErrorResponse);
        });

        it("calls loggerService.error with the correct params", async () => {
          await webSocketController.disconnect(mockRequest);

          expect(loggerService.error).toHaveBeenCalledTimes(1);
          expect(loggerService.error).toHaveBeenCalledWith("Error in disconnect", { error: mockError, request: mockRequest }, webSocketController.constructor.name);
        });

        it("calls this.generateErrorResponse with the correct params", async () => {
          await webSocketController.disconnect(mockRequest);

          expect(webSocketController.generateErrorResponse).toHaveBeenCalledTimes(1);
          expect(webSocketController.generateErrorResponse).toHaveBeenCalledWith(mockError);
        });

        it("returns the response of this.generateErrorResponse", async () => {
          const response = await webSocketController.disconnect(mockRequest);

          expect(response).toEqual(mockErrorResponse);
        });
      });
    });
  });
});
