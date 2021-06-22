/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport } from "@yac/core";
import { TeamCreationInputDto } from "../../models/team.creation.input.model";
import { Team } from "../../models/team.model";
import { TeamDynamoRepository } from "../../repositories/team.dynamo.repository";
import { TeamService, TeamServiceInterface } from "../team.service";

describe("TeamService", () => {
  let loggerService: Spied<LoggerService>;
  let teamRepository: Spied<TeamDynamoRepository>;
  let teamService: TeamServiceInterface;

  const mockUserId = "mock-user-id";
  const mockTeamId = "mock-team-id";
  const mockName = "mock@name.com";
  const mockError = new Error("mock-error");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    teamRepository = TestSupport.spyOnClass(TeamDynamoRepository);

    teamService = new TeamService(loggerService, teamRepository);
  });

  describe("createTeam", () => {
    const mockTeamCreationInput: TeamCreationInputDto = { name: mockName };

    const expectedRepositoryParam: Omit<Team, "id"> = {
      createdBy: mockUserId,
      name: mockName,
    };

    const mockCreatedTeam: Team = {
      id: mockTeamId,
      createdBy: mockUserId,
      name: mockName,
    };

    describe("under normal conditions", () => {
      beforeEach(() => {
        teamRepository.createTeam.and.returnValue(Promise.resolve(mockCreatedTeam));
      });

      it("calls teamRepository.createTeam with the correct params", async () => {
        await teamService.createTeam(mockTeamCreationInput, mockUserId);

        expect(teamRepository.createTeam).toHaveBeenCalledTimes(1);
        expect(teamRepository.createTeam).toHaveBeenCalledWith(expectedRepositoryParam);
      });

      it("returns the response of teamRepository.createTeam", async () => {
        const createdTeam = await teamService.createTeam(mockTeamCreationInput, mockUserId);

        expect(createdTeam).toBe(mockCreatedTeam);
      });
    });

    describe("under error conditions", () => {
      describe("when teamRepository.createTeam throws an error", () => {
        beforeEach(() => {
          teamRepository.createTeam.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await teamService.createTeam(mockTeamCreationInput, mockUserId);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in createTeam", { error: mockError, teamCreationInput: mockTeamCreationInput, userId: mockUserId }, teamService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamService.createTeam(mockTeamCreationInput, mockUserId);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("addUserToTeam", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        teamRepository.addUserToTeam.and.returnValue(Promise.resolve());
      });

      it("calls teamRepository.addUserToTeam with the correct params", async () => {
        await teamService.addUserToTeam(mockTeamId, mockUserId);

        expect(teamRepository.addUserToTeam).toHaveBeenCalledTimes(1);
        expect(teamRepository.addUserToTeam).toHaveBeenCalledWith(mockTeamId, mockUserId);
      });
    });

    describe("under error conditions", () => {
      describe("when teamRepository.addUserToTeam throws an error", () => {
        beforeEach(() => {
          teamRepository.addUserToTeam.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await teamService.addUserToTeam(mockTeamId, mockUserId);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in addUserToTeam", { error: mockError, teamId: mockTeamId, userId: mockUserId }, teamService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamService.addUserToTeam(mockTeamId, mockUserId);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("removeUserFromTeam", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        teamRepository.removeUserFromTeam.and.returnValue(Promise.resolve());
      });

      it("calls teamRepository.removeUserFromTeam with the correct params", async () => {
        await teamService.removeUserFromTeam(mockTeamId, mockUserId);

        expect(teamRepository.removeUserFromTeam).toHaveBeenCalledTimes(1);
        expect(teamRepository.removeUserFromTeam).toHaveBeenCalledWith(mockTeamId, mockUserId);
      });
    });

    describe("under error conditions", () => {
      describe("when teamRepository.removeUserFromTeam throws an error", () => {
        beforeEach(() => {
          teamRepository.removeUserFromTeam.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await teamService.removeUserFromTeam(mockTeamId, mockUserId);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in removeUserFromTeam", { error: mockError, teamId: mockTeamId, userId: mockUserId }, teamService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamService.removeUserFromTeam(mockTeamId, mockUserId);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getUsersByTeamId", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        teamRepository.getUsersByTeamId.and.returnValue(Promise.resolve([ mockUserId ]));
      });

      it("calls teamRepository.getUsersByTeamId with the correct params", async () => {
        await teamService.getUsersByTeamId(mockTeamId);

        expect(teamRepository.getUsersByTeamId).toHaveBeenCalledTimes(1);
        expect(teamRepository.getUsersByTeamId).toHaveBeenCalledWith(mockTeamId);
      });

      it("returns the response of teamRepository.getUsersByTeamId", async () => {
        const createdTeam = await teamService.getUsersByTeamId(mockTeamId);

        expect(createdTeam).toEqual([ mockUserId ]);
      });
    });

    describe("under error conditions", () => {
      describe("when teamRepository.getUsersByTeamId throws an error", () => {
        beforeEach(() => {
          teamRepository.getUsersByTeamId.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await teamService.getUsersByTeamId(mockTeamId);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getUsersByTeamId", { error: mockError, teamId: mockTeamId }, teamService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamService.getUsersByTeamId(mockTeamId);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
