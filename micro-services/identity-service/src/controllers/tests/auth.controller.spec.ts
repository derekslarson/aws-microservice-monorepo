import { Spied, TestSupport, LoggerService, ValidationService, SignUpInputDto } from "@yac/core";

import { AuthorizationService } from "../../services/authorization.service";
import { AuthenticationService } from "../../services/authentication.service";
import { AuthController, AuthControllerInterface } from "../auth.controller";

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
  let spyGenerateCreateResponse: jasmine.Spy;
  let spyGenerateErrorResponse: jasmine.Spy;

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    validationService = TestSupport.spyOnClass(ValidationService);
    authorizationService = TestSupport.spyOnClass(AuthorizationService);
    authenticationService = TestSupport.spyOnClass(AuthenticationService);
    authController = new AuthController(validationService, loggerService, authenticationService, authorizationService);

    spyGenerateCreateResponse = spyOn(authController, "generateSuccessResponse");
    spyGenerateErrorResponse = spyOn(authController, "generateErrorResponse");
    spyGenerateCreateResponse = spyOn(authController, "generateCreateResponse");
  });

  describe("signUp", () => {
    describe("fails correctly", () => {
      it("when ValidationService.validate errors", async () => {

      });

      it("when AuthenticationService.signUp errors", async () => {

      });
    });

    describe("success correctly", () => {

    });
  });
});
