/* eslint-disable @typescript-eslint/unbound-method */

import { Response, generateMockRequest, LoggerService, RequestPortion, Spied, TestSupport, ValidationService } from "@yac/core";
import { TeamCreationBodyInputDto } from "../../models/team.creation.input.model";
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
  const mockUserId = "mock-user-id";

  const mockServiceResponse = { mock: "service-response" };
  const mockSuccessResponse = { mock: "success-response" };
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
        validationService.validate.and.returnValue(Promise.resolve(mockValidationResponse));
        teamService.createTeam.and.returnValue(Promise.resolve(mockServiceResponse));
        spyOn(teamController, "getUserIdFromRequestWithJwt").and.returnValue(mockUserId);
        spyOn(teamController, "generateCreatedResponse").and.returnValue(mockSuccessResponse);
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
        expect(teamService.createTeam).toHaveBeenCalledWith(mockValidationResponse, mockUserId);
      });

      it("calls this.generateCreatedResponse with the correct params", async () => {
        await teamController.createTeam(mockRequest);

        expect(teamController.generateCreatedResponse).toHaveBeenCalledTimes(1);
        expect(teamController.generateCreatedResponse).toHaveBeenCalledWith(mockServiceResponse);
      });

      it("returns the response of this.generateCreatedResponse", async () => {
        const response = await teamController.createTeam(mockRequest);

        expect(response).toBe(mockSuccessResponse as Response);
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
});
