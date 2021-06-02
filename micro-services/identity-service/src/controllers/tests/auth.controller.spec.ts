import { Spied, TestSupport, LoggerService, ValidationService, RequestPortion, Request, generateMockRequest } from "@yac/core";

import { AuthorizationService } from "../../services/authorization.service";
import { AuthenticationService } from "../../services/authentication.service";
import { AuthController, AuthControllerInterface } from "../auth.controller";
import { SignUpInputDto } from "../../models/sign-up/signUp.input.model";
import { LoginInputDto } from "../../models/login/login.input.model";
import { ConfirmationInputDto } from "../../models/confirmation/confirmation.input.model";

interface AuthControllerWithAnyMethod extends AuthControllerInterface {
  [x: string]: any;
}

describe("AuthController", () => {
  let loggerService: Spied<LoggerService>;
  let validationService: Spied<ValidationService>;
  let authorizationService: Spied<AuthorizationService>;
  let authenticationService: Spied<AuthenticationService>;
  let authController: AuthControllerWithAnyMethod;
  let spyGenerateSuccessResponse: jasmine.Spy;
  let spyGenerateCreatedResponse: jasmine.Spy;
  let spyGenerateErrorResponse: jasmine.Spy;

  const mockRequest: Request = generateMockRequest({});

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    validationService = TestSupport.spyOnClass(ValidationService);
    authorizationService = TestSupport.spyOnClass(AuthorizationService);
    authenticationService = TestSupport.spyOnClass(AuthenticationService);
    authController = new AuthController(validationService, loggerService, authenticationService, authorizationService);

    spyGenerateSuccessResponse = spyOn(authController, "generateSuccessResponse");
    spyGenerateCreatedResponse = spyOn(authController, "generateCreatedResponse");
    spyGenerateErrorResponse = spyOn(authController, "generateErrorResponse");
  });

  describe("signUp", () => {
    describe("fails correctly", () => {
      const mockedError = new Error("Invalid");
      it("when ValidationService.validate errors", async () => {
        validationService.validate.and.returnValue(Promise.reject(mockedError));

        await authController.signUp(mockRequest);
        expect(validationService.validate).toHaveBeenCalledTimes(1);
        expect(validationService.validate).toHaveBeenCalledWith(SignUpInputDto, RequestPortion.Body, mockRequest.body);
        expect(spyGenerateErrorResponse).toHaveBeenCalledWith(mockedError);
      });

      it("when AuthenticationService.signUp errors", async () => {
        validationService.validate.and.returnValue(Promise.resolve({}));
        authenticationService.signUp.and.returnValue(Promise.reject(mockedError));

        await authController.signUp(mockRequest);
        expect(authenticationService.signUp).toHaveBeenCalledTimes(1);
        expect(authenticationService.signUp).toHaveBeenCalledWith({});
        expect(spyGenerateErrorResponse).toHaveBeenCalledWith(mockedError);
      });

      it("logs an error whenever something fails", async () => {
        validationService.validate.and.returnValue(Promise.reject(mockedError));

        await authController.signUp(mockRequest);

        expect(loggerService.error).toHaveBeenCalled();
        expect(loggerService.error).toHaveBeenCalledWith("Error in signUp", { error: mockedError, request: mockRequest }, authController.constructor.name);
      });
    });

    describe("success correctly", () => {
      it("calls ValidationService.validate correctly", async () => {
        validationService.validate.and.returnValue(Promise.resolve({}));
        authenticationService.signUp.and.returnValue(Promise.resolve({}));

        await authController.signUp(mockRequest);
        expect(validationService.validate).toHaveBeenCalledTimes(1);
        expect(validationService.validate).toHaveBeenCalledWith(SignUpInputDto, RequestPortion.Body, mockRequest.body);
        expect(spyGenerateCreatedResponse).toHaveBeenCalled();
      });

      it("calls AuthenticationService.signUp  correctly", async () => {
        const mockResponse = { is: "atest" };
        validationService.validate.and.returnValue(Promise.resolve(mockResponse));
        authenticationService.signUp.and.returnValue(Promise.resolve({}));

        await authController.signUp(mockRequest);
        expect(authenticationService.signUp).toHaveBeenCalledTimes(1);
        expect(authenticationService.signUp).toHaveBeenCalledWith(mockResponse);
        expect(spyGenerateCreatedResponse).toHaveBeenCalled();
      });
    });

    it("returns the right thing", async () => {
      const mockResponse = { is: "atest" };
      validationService.validate.and.returnValue(Promise.resolve());
      authenticationService.signUp.and.returnValue(Promise.resolve(mockResponse));

      await authController.signUp(mockRequest);
      expect(spyGenerateCreatedResponse).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe("login", () => {
    describe("fails correctly", () => {
      const mockedError = new Error("Invalid");
      it("when ValidationService.validate errors", async () => {
        validationService.validate.and.returnValue(Promise.reject(mockedError));

        await authController.login(mockRequest);
        expect(validationService.validate).toHaveBeenCalledTimes(1);
        expect(validationService.validate).toHaveBeenCalledWith(LoginInputDto, RequestPortion.Body, mockRequest.body);
        expect(spyGenerateErrorResponse).toHaveBeenCalledWith(mockedError);
      });

      it("when AuthenticationService.login errors", async () => {
        validationService.validate.and.returnValue(Promise.resolve({}));
        authenticationService.login.and.returnValue(Promise.reject(mockedError));

        await authController.login(mockRequest);
        expect(authenticationService.login).toHaveBeenCalledTimes(1);
        expect(authenticationService.login).toHaveBeenCalledWith({});
        expect(spyGenerateErrorResponse).toHaveBeenCalledWith(mockedError);
      });

      it("logs an error whenever something fails", async () => {
        validationService.validate.and.returnValue(Promise.reject(mockedError));

        await authController.login(mockRequest);

        expect(loggerService.error).toHaveBeenCalled();
        expect(loggerService.error).toHaveBeenCalledWith("Error in login", { error: mockedError, request: mockRequest }, authController.constructor.name);
      });
    });

    describe("success correctly", () => {
      it("calls ValidationService.validate correctly", async () => {
        validationService.validate.and.returnValue(Promise.resolve({}));
        authenticationService.login.and.returnValue(Promise.resolve({}));

        await authController.login(mockRequest);
        expect(validationService.validate).toHaveBeenCalledTimes(1);
        expect(validationService.validate).toHaveBeenCalledWith(LoginInputDto, RequestPortion.Body, mockRequest.body);
        expect(spyGenerateSuccessResponse).toHaveBeenCalled();
      });

      it("calls AuthenticationService.login correctly", async () => {
        const mockResponse = { is: "atest" };
        validationService.validate.and.returnValue(Promise.resolve(mockResponse));
        authenticationService.login.and.returnValue(Promise.resolve({}));

        await authController.login(mockRequest);
        expect(authenticationService.login).toHaveBeenCalledTimes(1);
        expect(authenticationService.login).toHaveBeenCalledWith(mockResponse);
        expect(spyGenerateSuccessResponse).toHaveBeenCalled();
      });

      it("returns the right thing", async () => {
        const mockResponse = { is: "atest" };
        validationService.validate.and.returnValue(Promise.resolve());
        authenticationService.login.and.returnValue(Promise.resolve(mockResponse));

        await authController.login(mockRequest);
        expect(spyGenerateSuccessResponse).toHaveBeenCalledWith(mockResponse);
      });
    });
  });

  describe("confirm", () => {
    describe("fails correctly", () => {
      const mockedError = new Error("Invalid");
      it("when ValidationService.validate errors", async () => {
        validationService.validate.and.returnValue(Promise.reject(mockedError));

        await authController.confirm(mockRequest);
        expect(validationService.validate).toHaveBeenCalledTimes(1);
        expect(validationService.validate).toHaveBeenCalledWith(ConfirmationInputDto, RequestPortion.Body, mockRequest.body);
        expect(spyGenerateErrorResponse).toHaveBeenCalledWith(mockedError);
      });

      it("when AuthenticationService.confirm errors", async () => {
        validationService.validate.and.returnValue(Promise.resolve({}));
        authenticationService.confirm.and.returnValue(Promise.reject(mockedError));

        await authController.confirm(mockRequest);
        expect(authenticationService.confirm).toHaveBeenCalledTimes(1);
        expect(authenticationService.confirm).toHaveBeenCalledWith({});
        expect(spyGenerateErrorResponse).toHaveBeenCalledWith(mockedError);
      });

      it("logs an error whenever something fails", async () => {
        validationService.validate.and.returnValue(Promise.reject(mockedError));

        await authController.confirm(mockRequest);

        expect(loggerService.error).toHaveBeenCalled();
        expect(loggerService.error).toHaveBeenCalledWith("Error in confirm", { error: mockedError, request: mockRequest }, authController.constructor.name);
      });
    });

    describe("success correctly", () => {
      it("calls ValidationService.validate correctly", async () => {
        const mockResponse = { confirmed: false, session: "mock-session", authorizationCode: "mock-authorization-code" };
        validationService.validate.and.returnValue(Promise.resolve({}));
        // when i do Promise.resolve() here it gets crazy results and fails
        authenticationService.confirm.and.returnValue(mockResponse);

        await authController.confirm(mockRequest);
        expect(validationService.validate).toHaveBeenCalledTimes(1);
        expect(validationService.validate).toHaveBeenCalledWith(ConfirmationInputDto, RequestPortion.Body, mockRequest.body);
        expect(spyGenerateSuccessResponse).toHaveBeenCalled();
      });

      it("calls AuthenticationService.confirm correctly", async () => {
        const mockResponse = { is: "atest" };
        validationService.validate.and.returnValue(Promise.resolve(mockResponse));
        authenticationService.confirm.and.returnValue(Promise.resolve({}));

        await authController.confirm(mockRequest);
        expect(authenticationService.confirm).toHaveBeenCalledTimes(1);
        expect(authenticationService.confirm).toHaveBeenCalledWith(mockResponse);
        expect(spyGenerateSuccessResponse).toHaveBeenCalled();
      });

      it("calls AuthorizationService.getTokens correctly", async () => {
        const mockResponse = { confirmed: true, authorizationCode: "mock-authorization-code" };
        const mockTokens = { tokens: 123 };
        validationService.validate.and.returnValue(Promise.resolve());
        authenticationService.confirm.and.returnValue(Promise.resolve(mockResponse));
        authorizationService.getTokens.and.returnValue(Promise.resolve({ tokens: mockTokens }));

        await authController.confirm(mockRequest);
        expect(authorizationService.getTokens).toHaveBeenCalledTimes(1);
        expect(authorizationService.getTokens).toHaveBeenCalledWith(mockResponse.authorizationCode);
        expect(spyGenerateSuccessResponse).toHaveBeenCalled();
      });

      it("returns the right thing: when there is no session active", async () => {
        const mockResponse = { confirmed: true, authorizationCode: "mock-authorization-code" };
        const mockTokens = { tokens: 123 };
        validationService.validate.and.returnValue(Promise.resolve());
        authenticationService.confirm.and.returnValue(mockResponse);
        authorizationService.getTokens.and.returnValue(mockTokens);

        await authController.confirm(mockRequest);
        expect(spyGenerateSuccessResponse).toHaveBeenCalled();
        expect(spyGenerateSuccessResponse).toHaveBeenCalledWith({ confirmed: mockResponse.confirmed, ...mockTokens });
      });

      it("returns the right thing: when there is a session active", async () => {
        const mockResponse = { confirmed: true, session: "mock-active-session" };
        validationService.validate.and.returnValue(Promise.resolve());
        authenticationService.confirm.and.returnValue(mockResponse);

        await authController.confirm(mockRequest);
        expect(spyGenerateSuccessResponse).toHaveBeenCalled();
        expect(spyGenerateSuccessResponse).toHaveBeenCalledWith(mockResponse);
      });
    });
  });
});
