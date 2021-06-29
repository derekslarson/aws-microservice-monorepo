/* eslint-disable @typescript-eslint/unbound-method */

import { Response, generateMockRequest, LoggerService, RequestPortion, Spied, TestSupport, ValidationService, ForbiddenError } from "@yac/core";
import { TeamsGetByUserIdPathParametersDto } from "../../models/team/teams.getByUserId.input.model";
import { TeamService } from "../../services/team.service";
import { UserService } from "../../services/user.service";
import { UserController, UserControllerInterface } from "../user.controller";

interface UserControllerWithProtectedMethods extends UserControllerInterface {
  [key: string]: any;
}

describe("UserController", () => {
  let validationService: Spied<ValidationService>;
  let loggerService: Spied<LoggerService>;
  let userService: Spied<UserService>;
  let teamService: Spied<TeamService>;
  let userController: UserControllerWithProtectedMethods;

  const mockError = new Error("mock-error");
  const mockUserId = "mock-user-id";
  const mockAuthUserId = mockUserId;

  const mockServiceResponse = { mock: "service-response" };
  const mockSuccessResponse = { mock: "success-response" };
  const mockErrorResponse = { mock: "error-response" };

  beforeEach(() => {
    validationService = TestSupport.spyOnClass(ValidationService);
    loggerService = TestSupport.spyOnClass(LoggerService);
    teamService = TestSupport.spyOnClass(TeamService);
    userService = TestSupport.spyOnClass(UserService);
    userController = new UserController(validationService, loggerService, teamService, userService);
  });

  describe("getUsersByTeamId", () => {
    const mockRequest = generateMockRequest({});

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(userController, "getUserIdFromRequestWithJwt").and.returnValue(mockAuthUserId);
        validationService.validate.and.returnValues(Promise.resolve({ userId: mockUserId }));
        userService.getUsersByTeamId.and.returnValue(Promise.resolve(mockServiceResponse));
        spyOn(userController, "generateSuccessResponse").and.returnValue(mockSuccessResponse);
      });

      it("calls this.getUserIdFromRequestWithJwt with the correct params", async () => {
        await userController.getUsersByTeamId(mockRequest);

        expect(userController.getUserIdFromRequestWithJwt).toHaveBeenCalledTimes(1);
        expect(userController.getUserIdFromRequestWithJwt).toHaveBeenCalledWith(mockRequest);
      });

      it("calls validationService.validate with the correct params", async () => {
        await userController.getUsersByTeamId(mockRequest);

        expect(validationService.validate).toHaveBeenCalledTimes(1);
        expect(validationService.validate).toHaveBeenCalledWith(TeamsGetByUserIdPathParametersDto, RequestPortion.PathParameters, mockRequest.pathParameters);
      });

      it("calls userService.getUsersByTeamId with the correct params", async () => {
        await userController.getUsersByTeamId(mockRequest);

        expect(userService.getUsersByTeamId).toHaveBeenCalledTimes(1);
        expect(userService.getUsersByTeamId).toHaveBeenCalledWith(mockUserId);
      });

      it("calls this.generateSuccessResponse with the correct params", async () => {
        await userController.getUsersByTeamId(mockRequest);

        expect(userController.generateSuccessResponse).toHaveBeenCalledTimes(1);
        expect(userController.generateSuccessResponse).toHaveBeenCalledWith({ teams: mockServiceResponse });
      });

      it("returns the response of this.generateSuccessResponse", async () => {
        const response = await userController.getUsersByTeamId(mockRequest);

        expect(response).toBe(mockSuccessResponse as Response);
      });
    });

    describe("under error conditions", () => {
      describe("when the userId in the JWT does not match the userId in the path", () => {
        beforeEach(() => {
          spyOn(userController, "getUserIdFromRequestWithJwt").and.returnValue("invalid-id");
          validationService.validate.and.returnValues(Promise.resolve({ userId: mockUserId }), Promise.resolve({ userId: mockUserId }));
          spyOn(userController, "generateErrorResponse");
        });

        it("calls generateErrorResponse with a ForbiddenError", async () => {
          await userController.getUsersByTeamId(mockRequest);

          expect(userController.generateErrorResponse).toHaveBeenCalledWith(new ForbiddenError("Forbidden"));
        });
      });

      describe("when an error is thrown", () => {
        beforeEach(() => {
          spyOn(userController, "getUserIdFromRequestWithJwt").and.throwError(mockError);
          spyOn(userController, "generateErrorResponse").and.returnValue(mockErrorResponse);
        });

        it("calls loggerService.error with the correct params", async () => {
          await userController.getUsersByTeamId(mockRequest);

          expect(loggerService.error).toHaveBeenCalledTimes(1);
          expect(loggerService.error).toHaveBeenCalledWith("Error in getUsersByTeamId", { error: mockError, request: mockRequest }, userController.constructor.name);
        });

        it("calls this.generateErrorResponse with the correct params", async () => {
          await userController.getUsersByTeamId(mockRequest);

          expect(userController.generateErrorResponse).toHaveBeenCalledTimes(1);
          expect(userController.generateErrorResponse).toHaveBeenCalledWith(mockError);
        });

        it("returns the response of this.generateErrorResponse", async () => {
          const response = await userController.getUsersByTeamId(mockRequest);

          expect(response).toBe(mockErrorResponse as Response);
        });
      });
    });
  });
});
