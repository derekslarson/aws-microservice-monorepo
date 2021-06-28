/* eslint-disable @typescript-eslint/unbound-method */

import { Response, generateMockRequest, LoggerService, RequestPortion, Spied, TestSupport, ValidationService, ForbiddenError, Role } from "@yac/core";
import { TeamAddMemberBodyInputDto, TeamAddMemberPathParametersInputDto } from "../../models/team.addMember.input.model";
import { TeamCreationBodyInputDto } from "../../models/team.creation.input.model";
import { TeamRemoveMemberPathParametersInputDto } from "../../models/team.removeMember.input.model";
import { UsersGetByTeamIdPathParametersInputDto } from "../../models/users.getByTeamId.input.model";
import { TeamService } from "../../services/team.service";
import { TeamController, TeamControllerInterface } from "../team.controller";

interface TeamControllerWithProtectedMethods extends TeamControllerInterface {
  [key: string]: any;
}

describe("TeamController", () => {
  let validationService: Spied<ValidationService>;
  let loggerService: Spied<LoggerService>;
  let teamService: Spied<TeamService>;
  let teamController: TeamControllerWithProtectedMethods;

  const mockError = new Error("mock-error");
  const mockValidationResponse = { mock: "validation-response" };
  const mockTeamId = "mock-team-id";
  const mockAuthUserId = "mock-auth-user-id";
  const mockUserId = "mock-user-id";
  const mockRole = Role.User;

  const mockServiceResponse = { mock: "service-response" };
  const mockSuccessResponse = { mock: "success-response" };
  const mockCreatedResponse = { mock: "created-response" };
  const mockErrorResponse = { mock: "error-response" };

  beforeEach(() => {
    validationService = TestSupport.spyOnClass(ValidationService);
    loggerService = TestSupport.spyOnClass(LoggerService);
    teamService = TestSupport.spyOnClass(TeamService);
    teamController = new TeamController(validationService, loggerService, teamService);
  });

  describe("createTeam", () => {
    const mockRequest = generateMockRequest({});

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(teamController, "getUserIdFromRequestWithJwt").and.returnValue(mockAuthUserId);
        validationService.validate.and.returnValue(Promise.resolve(mockValidationResponse));
        teamService.createTeam.and.returnValue(Promise.resolve(mockServiceResponse));
        spyOn(teamController, "generateCreatedResponse").and.returnValue(mockCreatedResponse);
      });

      it("calls this.getUserIdFromRequestWithJwt with the correct params", async () => {
        await teamController.createTeam(mockRequest);

        expect(teamController.getUserIdFromRequestWithJwt).toHaveBeenCalledTimes(1);
        expect(teamController.getUserIdFromRequestWithJwt).toHaveBeenCalledWith(mockRequest);
      });

      it("calls validationService.validate with the correct params", async () => {
        await teamController.createTeam(mockRequest);

        expect(validationService.validate).toHaveBeenCalledTimes(1);
        expect(validationService.validate).toHaveBeenCalledWith(TeamCreationBodyInputDto, RequestPortion.Body, mockRequest.body);
      });

      it("calls teamService.createTeam with the correct params", async () => {
        await teamController.createTeam(mockRequest);

        expect(teamService.createTeam).toHaveBeenCalledTimes(1);
        expect(teamService.createTeam).toHaveBeenCalledWith(mockValidationResponse, mockAuthUserId);
      });

      it("calls this.generateCreatedResponse with the correct params", async () => {
        await teamController.createTeam(mockRequest);

        expect(teamController.generateCreatedResponse).toHaveBeenCalledTimes(1);
        expect(teamController.generateCreatedResponse).toHaveBeenCalledWith(mockServiceResponse);
      });

      it("returns the response of this.generateCreatedResponse", async () => {
        const response = await teamController.createTeam(mockRequest);

        expect(response).toBe(mockCreatedResponse as Response);
      });
    });

    describe("under error conditions", () => {
      describe("when an error is thrown", () => {
        beforeEach(() => {
          spyOn(teamController, "getUserIdFromRequestWithJwt").and.throwError(mockError);
          spyOn(teamController, "generateErrorResponse").and.returnValue(mockErrorResponse);
        });

        it("calls loggerService.error with the correct params", async () => {
          await teamController.createTeam(mockRequest);

          expect(loggerService.error).toHaveBeenCalledTimes(1);
          expect(loggerService.error).toHaveBeenCalledWith("Error in createTeam", { error: mockError, request: mockRequest }, teamController.constructor.name);
        });

        it("calls this.generateErrorResponse with the correct params", async () => {
          await teamController.createTeam(mockRequest);

          expect(teamController.generateErrorResponse).toHaveBeenCalledTimes(1);
          expect(teamController.generateErrorResponse).toHaveBeenCalledWith(mockError);
        });

        it("returns the response of this.generateErrorResponse", async () => {
          const response = await teamController.createTeam(mockRequest);

          expect(response).toBe(mockErrorResponse as Response);
        });
      });
    });
  });

  describe("addUserToTeam", () => {
    const mockRequest = generateMockRequest({});

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(teamController, "getUserIdFromRequestWithJwt").and.returnValue(mockAuthUserId);
        validationService.validate.and.returnValues(Promise.resolve({ teamId: mockTeamId }), Promise.resolve({ userId: mockUserId, role: mockRole }));
        teamService.isTeamAdmin.and.returnValue(Promise.resolve(true));
        teamService.addUserToTeam.and.returnValue(Promise.resolve());
        spyOn(teamController, "generateSuccessResponse").and.returnValue(mockSuccessResponse);
      });

      it("calls this.getUserIdFromRequestWithJwt with the correct params", async () => {
        await teamController.addUserToTeam(mockRequest);

        expect(teamController.getUserIdFromRequestWithJwt).toHaveBeenCalledTimes(1);
        expect(teamController.getUserIdFromRequestWithJwt).toHaveBeenCalledWith(mockRequest);
      });

      it("calls validationService.validate with the correct params", async () => {
        await teamController.addUserToTeam(mockRequest);

        expect(validationService.validate).toHaveBeenCalledTimes(2);
        expect(validationService.validate).toHaveBeenCalledWith(TeamAddMemberPathParametersInputDto, RequestPortion.PathParameters, mockRequest.pathParameters);
        expect(validationService.validate).toHaveBeenCalledWith(TeamAddMemberBodyInputDto, RequestPortion.Body, mockRequest.body);
      });

      it("calls teamService.isTeamAdmin with the correct params", async () => {
        await teamController.addUserToTeam(mockRequest);

        expect(teamService.isTeamAdmin).toHaveBeenCalledTimes(1);
        expect(teamService.isTeamAdmin).toHaveBeenCalledWith(mockTeamId, mockAuthUserId);
      });

      it("calls teamService.addUserToTeam with the correct params", async () => {
        await teamController.addUserToTeam(mockRequest);

        expect(teamService.addUserToTeam).toHaveBeenCalledTimes(1);
        expect(teamService.addUserToTeam).toHaveBeenCalledWith(mockTeamId, mockUserId, mockRole);
      });

      it("calls this.generateSuccessResponse with the correct params", async () => {
        await teamController.addUserToTeam(mockRequest);

        expect(teamController.generateSuccessResponse).toHaveBeenCalledTimes(1);
        expect(teamController.generateSuccessResponse).toHaveBeenCalledWith({ message: "user added to team" });
      });

      it("returns the response of this.generateSuccessResponse", async () => {
        const response = await teamController.addUserToTeam(mockRequest);

        expect(response).toBe(mockSuccessResponse as Response);
      });
    });

    describe("under error conditions", () => {
      describe("when teamService.isTeamAdmin returns false", () => {
        beforeEach(() => {
          spyOn(teamController, "getUserIdFromRequestWithJwt").and.returnValue(mockAuthUserId);
          validationService.validate.and.returnValues(Promise.resolve({ teamId: mockTeamId }), Promise.resolve({ userId: mockUserId, role: mockRole }));
          teamService.isTeamAdmin.and.returnValue(Promise.resolve(false));
          spyOn(teamController, "generateErrorResponse");
        });

        it("throws a ForbiddenError", async () => {
          await teamController.addUserToTeam(mockRequest);

          expect(teamController.generateErrorResponse).toHaveBeenCalledWith(new ForbiddenError("Forbidden"));
        });
      });

      describe("when an error is thrown", () => {
        beforeEach(() => {
          spyOn(teamController, "getUserIdFromRequestWithJwt").and.throwError(mockError);
          spyOn(teamController, "generateErrorResponse").and.returnValue(mockErrorResponse);
        });

        it("calls loggerService.error with the correct params", async () => {
          await teamController.addUserToTeam(mockRequest);

          expect(loggerService.error).toHaveBeenCalledTimes(1);
          expect(loggerService.error).toHaveBeenCalledWith("Error in addUserToTeam", { error: mockError, request: mockRequest }, teamController.constructor.name);
        });

        it("calls this.generateErrorResponse with the correct params", async () => {
          await teamController.addUserToTeam(mockRequest);

          expect(teamController.generateErrorResponse).toHaveBeenCalledTimes(1);
          expect(teamController.generateErrorResponse).toHaveBeenCalledWith(mockError);
        });

        it("returns the response of this.generateErrorResponse", async () => {
          const response = await teamController.addUserToTeam(mockRequest);

          expect(response).toBe(mockErrorResponse as Response);
        });
      });
    });
  });

  describe("removeUserFromTeam", () => {
    const mockRequest = generateMockRequest({});

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(teamController, "getUserIdFromRequestWithJwt").and.returnValue(mockAuthUserId);
        validationService.validate.and.returnValue(Promise.resolve({ teamId: mockTeamId, userId: mockUserId }));
        teamService.isTeamAdmin.and.returnValue(Promise.resolve(true));
        teamService.removeUserFromTeam.and.returnValue(Promise.resolve());
        spyOn(teamController, "generateSuccessResponse").and.returnValue(mockSuccessResponse);
      });

      it("calls this.getUserIdFromRequestWithJwt with the correct params", async () => {
        await teamController.removeUserFromTeam(mockRequest);

        expect(teamController.getUserIdFromRequestWithJwt).toHaveBeenCalledTimes(1);
        expect(teamController.getUserIdFromRequestWithJwt).toHaveBeenCalledWith(mockRequest);
      });

      it("calls validationService.validate with the correct params", async () => {
        await teamController.removeUserFromTeam(mockRequest);

        expect(validationService.validate).toHaveBeenCalledTimes(1);
        expect(validationService.validate).toHaveBeenCalledWith(TeamRemoveMemberPathParametersInputDto, RequestPortion.PathParameters, mockRequest.pathParameters);
      });

      it("calls teamService.isTeamAdmin with the correct params", async () => {
        await teamController.removeUserFromTeam(mockRequest);

        expect(teamService.isTeamAdmin).toHaveBeenCalledTimes(1);
        expect(teamService.isTeamAdmin).toHaveBeenCalledWith(mockTeamId, mockAuthUserId);
      });

      it("calls teamService.removeUserFromTeam with the correct params", async () => {
        await teamController.removeUserFromTeam(mockRequest);

        expect(teamService.removeUserFromTeam).toHaveBeenCalledTimes(1);
        expect(teamService.removeUserFromTeam).toHaveBeenCalledWith(mockTeamId, mockUserId);
      });

      it("calls this.generateSuccessResponse with the correct params", async () => {
        await teamController.removeUserFromTeam(mockRequest);

        expect(teamController.generateSuccessResponse).toHaveBeenCalledTimes(1);
        expect(teamController.generateSuccessResponse).toHaveBeenCalledWith({ message: "user removed from team" });
      });

      it("returns the response of this.generateSuccessResponse", async () => {
        const response = await teamController.removeUserFromTeam(mockRequest);

        expect(response).toBe(mockSuccessResponse as Response);
      });
    });

    describe("under error conditions", () => {
      describe("when teamService.isTeamAdmin returns false", () => {
        beforeEach(() => {
          spyOn(teamController, "getUserIdFromRequestWithJwt").and.returnValue(mockAuthUserId);
          validationService.validate.and.returnValue(Promise.resolve({ teamId: mockTeamId, userId: mockUserId }));
          teamService.isTeamAdmin.and.returnValue(Promise.resolve(false));
          spyOn(teamController, "generateErrorResponse");
        });

        it("throws a ForbiddenError", async () => {
          await teamController.removeUserFromTeam(mockRequest);

          expect(teamController.generateErrorResponse).toHaveBeenCalledWith(new ForbiddenError("Forbidden"));
        });
      });

      describe("when an error is thrown", () => {
        beforeEach(() => {
          spyOn(teamController, "getUserIdFromRequestWithJwt").and.throwError(mockError);
          spyOn(teamController, "generateErrorResponse").and.returnValue(mockErrorResponse);
        });

        it("calls loggerService.error with the correct params", async () => {
          await teamController.removeUserFromTeam(mockRequest);

          expect(loggerService.error).toHaveBeenCalledTimes(1);
          expect(loggerService.error).toHaveBeenCalledWith("Error in removeUserFromTeam", { error: mockError, request: mockRequest }, teamController.constructor.name);
        });

        it("calls this.generateErrorResponse with the correct params", async () => {
          await teamController.removeUserFromTeam(mockRequest);

          expect(teamController.generateErrorResponse).toHaveBeenCalledTimes(1);
          expect(teamController.generateErrorResponse).toHaveBeenCalledWith(mockError);
        });

        it("returns the response of this.generateErrorResponse", async () => {
          const response = await teamController.removeUserFromTeam(mockRequest);

          expect(response).toBe(mockErrorResponse as Response);
        });
      });
    });
  });

  describe("getTeamsByUserId", () => {
    const mockRequest = generateMockRequest({});

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(teamController, "getUserIdFromRequestWithJwt").and.returnValue(mockAuthUserId);
        validationService.validate.and.returnValues(Promise.resolve({ teamId: mockTeamId }));
        teamService.isTeamMember.and.returnValue(Promise.resolve(true));
        teamService.getTeamsByUserId.and.returnValue(Promise.resolve(mockServiceResponse));
        spyOn(teamController, "generateSuccessResponse").and.returnValue(mockSuccessResponse);
      });

      it("calls this.getUserIdFromRequestWithJwt with the correct params", async () => {
        await teamController.getTeamsByUserId(mockRequest);

        expect(teamController.getUserIdFromRequestWithJwt).toHaveBeenCalledTimes(1);
        expect(teamController.getUserIdFromRequestWithJwt).toHaveBeenCalledWith(mockRequest);
      });

      it("calls validationService.validate with the correct params", async () => {
        await teamController.getTeamsByUserId(mockRequest);

        expect(validationService.validate).toHaveBeenCalledTimes(1);
        expect(validationService.validate).toHaveBeenCalledWith(UsersGetByTeamIdPathParametersInputDto, RequestPortion.PathParameters, mockRequest.pathParameters);
      });

      it("calls teamService.isTeamMember with the correct params", async () => {
        await teamController.getTeamsByUserId(mockRequest);

        expect(teamService.isTeamMember).toHaveBeenCalledTimes(1);
        expect(teamService.isTeamMember).toHaveBeenCalledWith(mockTeamId, mockAuthUserId);
      });

      it("calls teamService.getTeamsByUserId with the correct params", async () => {
        await teamController.getTeamsByUserId(mockRequest);

        expect(teamService.getTeamsByUserId).toHaveBeenCalledTimes(1);
        expect(teamService.getTeamsByUserId).toHaveBeenCalledWith(mockTeamId);
      });

      it("calls this.generateSuccessResponse with the correct params", async () => {
        await teamController.getTeamsByUserId(mockRequest);

        expect(teamController.generateSuccessResponse).toHaveBeenCalledTimes(1);
        expect(teamController.generateSuccessResponse).toHaveBeenCalledWith({ users: mockServiceResponse });
      });

      it("returns the response of this.generateSuccessResponse", async () => {
        const response = await teamController.getTeamsByUserId(mockRequest);

        expect(response).toBe(mockSuccessResponse as Response);
      });
    });

    describe("under error conditions", () => {
      describe("when teamService.isTeamMember returns false", () => {
        beforeEach(() => {
          spyOn(teamController, "getUserIdFromRequestWithJwt").and.returnValue(mockAuthUserId);
          validationService.validate.and.returnValues(Promise.resolve({ teamId: mockTeamId }), Promise.resolve({ teamId: mockTeamId }));
          teamService.isTeamMember.and.returnValue(Promise.resolve(false));
          spyOn(teamController, "generateErrorResponse");
        });

        it("calls generateErrorResponse with a ForbiddenError", async () => {
          await teamController.getTeamsByUserId(mockRequest);

          expect(teamController.generateErrorResponse).toHaveBeenCalledWith(new ForbiddenError("Forbidden"));
        });
      });

      describe("when an error is thrown", () => {
        beforeEach(() => {
          spyOn(teamController, "getUserIdFromRequestWithJwt").and.throwError(mockError);
          spyOn(teamController, "generateErrorResponse").and.returnValue(mockErrorResponse);
        });

        it("calls loggerService.error with the correct params", async () => {
          await teamController.getTeamsByUserId(mockRequest);

          expect(loggerService.error).toHaveBeenCalledTimes(1);
          expect(loggerService.error).toHaveBeenCalledWith("Error in getTeamsByUserId", { error: mockError, request: mockRequest }, teamController.constructor.name);
        });

        it("calls this.generateErrorResponse with the correct params", async () => {
          await teamController.getTeamsByUserId(mockRequest);

          expect(teamController.generateErrorResponse).toHaveBeenCalledTimes(1);
          expect(teamController.generateErrorResponse).toHaveBeenCalledWith(mockError);
        });

        it("returns the response of this.generateErrorResponse", async () => {
          const response = await teamController.getTeamsByUserId(mockRequest);

          expect(response).toBe(mockErrorResponse as Response);
        });
      });
    });
  });
});
