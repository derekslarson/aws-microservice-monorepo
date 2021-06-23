/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, NotFoundError, Spied, TestSupport } from "@yac/core";
import { Role } from "../../enums/role.enum";
import { TeamCreationBodyInputDto } from "../../models/team.creation.input.model";
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
  const mockRole = Role.User;
  const mockTeamUserRelationship = { teamId: mockTeamId, userId: mockUserId, role: mockRole };
  const mockTeamUserRelationshipAdmin = { teamId: mockTeamId, userId: mockUserId, role: Role.Admin };
  const mockError = new Error("mock-error");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    teamRepository = TestSupport.spyOnClass(TeamDynamoRepository);

    teamService = new TeamService(loggerService, teamRepository);
  });

  describe("createTeam", () => {
    const mockTeamCreationInput: TeamCreationBodyInputDto = { name: mockName };

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
        teamRepository.createTeamUserRelationship.and.returnValue(Promise.resolve());
      });

      it("calls teamRepository.createTeamUserRelationship with the correct params", async () => {
        await teamService.addUserToTeam(mockTeamId, mockUserId, mockRole);

        expect(teamRepository.createTeamUserRelationship).toHaveBeenCalledTimes(1);
        expect(teamRepository.createTeamUserRelationship).toHaveBeenCalledWith(mockTeamId, mockUserId, mockRole);
      });
    });

    describe("under error conditions", () => {
      describe("when teamRepository.createTeamUserRelationship throws an error", () => {
        beforeEach(() => {
          teamRepository.createTeamUserRelationship.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await teamService.addUserToTeam(mockTeamId, mockUserId, mockRole);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in addUserToTeam", { error: mockError, teamId: mockTeamId, userId: mockUserId, role: mockRole }, teamService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamService.addUserToTeam(mockTeamId, mockUserId, mockRole);

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
        teamRepository.deleteTeamUserRelationship.and.returnValue(Promise.resolve());
      });

      it("calls teamRepository.deleteTeamUserRelationship with the correct params", async () => {
        await teamService.removeUserFromTeam(mockTeamId, mockUserId);

        expect(teamRepository.deleteTeamUserRelationship).toHaveBeenCalledTimes(1);
        expect(teamRepository.deleteTeamUserRelationship).toHaveBeenCalledWith(mockTeamId, mockUserId);
      });
    });

    describe("under error conditions", () => {
      describe("when teamRepository.deleteTeamUserRelationship throws an error", () => {
        beforeEach(() => {
          teamRepository.deleteTeamUserRelationship.and.throwError(mockError);
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
        teamRepository.getTeamUserRelationshipsByTeamId.and.returnValue(Promise.resolve([ mockTeamUserRelationship ]));
      });

      it("calls teamRepository.getTeamUserRelationshipsByTeamId with the correct params", async () => {
        await teamService.getUsersByTeamId(mockTeamId);

        expect(teamRepository.getTeamUserRelationshipsByTeamId).toHaveBeenCalledTimes(1);
        expect(teamRepository.getTeamUserRelationshipsByTeamId).toHaveBeenCalledWith(mockTeamId);
      });

      it("returns the response of teamRepository.getTeamUserRelationshipsByTeamId", async () => {
        const { teamId, ...expectedUser } = mockTeamUserRelationship;

        const users = await teamService.getUsersByTeamId(mockTeamId);

        expect(users).toEqual([ expectedUser ]);
      });
    });

    describe("under error conditions", () => {
      describe("when teamRepository.getTeamUserRelationshipsByTeamId throws an error", () => {
        beforeEach(() => {
          teamRepository.getTeamUserRelationshipsByTeamId.and.throwError(mockError);
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

  describe("isTeamMember", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        teamRepository.getTeamUserRelationship.and.returnValue(Promise.resolve(mockTeamUserRelationship));
      });

      it("calls teamRepository.getTeamUserRelationship with the correct params", async () => {
        await teamService.isTeamMember(mockTeamId, mockUserId);

        expect(teamRepository.getTeamUserRelationship).toHaveBeenCalledTimes(1);
        expect(teamRepository.getTeamUserRelationship).toHaveBeenCalledWith(mockTeamId, mockUserId);
      });

      describe("when teamRepository.getTeamUserRelationship doesn't throw", () => {
        it("returns true", async () => {
          const isTeamMember = await teamService.isTeamMember(mockTeamId, mockUserId);

          expect(isTeamMember).toBe(true);
        });
      });

      describe("when teamRepository.getTeamUserRelationship throws a NotFoundError", () => {
        beforeEach(() => {
          teamRepository.getTeamUserRelationship.and.throwError(new NotFoundError("mock-not-found-error"));
        });

        it("returns false", async () => {
          const isTeamMember = await teamService.isTeamMember(mockTeamId, mockUserId);

          expect(isTeamMember).toBe(false);
        });

        it("doesn't call loggerService.error", async () => {
          await teamService.isTeamMember(mockTeamId, mockUserId);

          expect(loggerService.error).not.toHaveBeenCalled();
        });
      });
    });

    describe("under error conditions", () => {
      describe("when teamRepository.getTeamUserRelationship throws an error that isn't a NotFoundError", () => {
        beforeEach(() => {
          teamRepository.getTeamUserRelationship.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await teamService.isTeamMember(mockTeamId, mockUserId);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in isTeamMember", { error: mockError, teamId: mockTeamId, userId: mockUserId }, teamService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamService.isTeamMember(mockTeamId, mockUserId);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("isTeamAdmin", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        teamRepository.getTeamUserRelationship.and.returnValue(Promise.resolve(mockTeamUserRelationship));
      });

      it("calls teamRepository.getTeamUserRelationship with the correct params", async () => {
        await teamService.isTeamAdmin(mockTeamId, mockUserId);

        expect(teamRepository.getTeamUserRelationship).toHaveBeenCalledTimes(1);
        expect(teamRepository.getTeamUserRelationship).toHaveBeenCalledWith(mockTeamId, mockUserId);
      });

      describe("when teamRepository.getTeamUserRelationship returns a TeamUserRelationship with an Admin role", () => {
        beforeEach(() => {
          teamRepository.getTeamUserRelationship.and.returnValue(Promise.resolve(mockTeamUserRelationshipAdmin));
        });

        it("returns true", async () => {
          const isTeamAdmin = await teamService.isTeamAdmin(mockTeamId, mockUserId);

          expect(isTeamAdmin).toBe(true);
        });
      });

      describe("when teamRepository.getTeamUserRelationship returns a TeamUserRelationship with a User role", () => {
        beforeEach(() => {
          teamRepository.getTeamUserRelationship.and.returnValue(Promise.resolve(mockTeamUserRelationship));
        });

        it("returns false", async () => {
          const isTeamAdmin = await teamService.isTeamAdmin(mockTeamId, mockUserId);

          expect(isTeamAdmin).toBe(false);
        });
      });

      describe("when teamRepository.getTeamUserRelationship throws a NotFoundError", () => {
        beforeEach(() => {
          teamRepository.getTeamUserRelationship.and.throwError(new NotFoundError("mock-not-found-error"));
        });

        it("returns false", async () => {
          const isTeamAdmin = await teamService.isTeamAdmin(mockTeamId, mockUserId);

          expect(isTeamAdmin).toBe(false);
        });

        it("doesn't call loggerService.error", async () => {
          await teamService.isTeamAdmin(mockTeamId, mockUserId);

          expect(loggerService.error).not.toHaveBeenCalled();
        });
      });
    });

    describe("under error conditions", () => {
      describe("when teamRepository.getTeamUserRelationship throws an error that isn't a NotFoundError", () => {
        beforeEach(() => {
          teamRepository.getTeamUserRelationship.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await teamService.isTeamAdmin(mockTeamId, mockUserId);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in isTeamAdmin", { error: mockError, teamId: mockTeamId, userId: mockUserId }, teamService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamService.isTeamAdmin(mockTeamId, mockUserId);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
