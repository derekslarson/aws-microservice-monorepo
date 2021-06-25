/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Role, Spied, TestSupport, User } from "@yac/core";
import { UserCreationInput } from "../../models/user.creation.input.model";
import { UserDynamoRepository } from "../../repositories/user.dynamo.repository";
import { UserService, UserServiceInterface } from "../user.service";

describe("UserService", () => {
  let loggerService: Spied<LoggerService>;
  let userRepository: Spied<UserDynamoRepository>;
  let userService: UserServiceInterface;

  const mockId = "mock-id";
  const mockTeamId = "mock-team-id";
  const mockRole = Role.User;
  const mockEmail = "mock@email.com";
  const mockTeamUserRelationship = { teamId: mockTeamId, userId: mockId, role: mockRole };
  const mockError = new Error("mock-error");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    userRepository = TestSupport.spyOnClass(UserDynamoRepository);

    userService = new UserService(loggerService, userRepository);
  });

  describe("createUser", () => {
    const mockUserCreationInput: UserCreationInput = {
      id: mockId,
      email: mockEmail,
    };

    const expectedRepositoryParam: User = {
      id: mockId,
      email: mockEmail,
    };

    const mockCreatedUser: User = {
      id: mockId,
      email: mockEmail,
    };

    describe("under normal conditions", () => {
      beforeEach(() => {
        userRepository.createUser.and.returnValue(Promise.resolve(mockCreatedUser));
      });

      it("calls userRepository.createUser with the correct params", async () => {
        await userService.createUser(mockUserCreationInput);

        expect(userRepository.createUser).toHaveBeenCalledTimes(1);
        expect(userRepository.createUser).toHaveBeenCalledWith(expectedRepositoryParam);
      });
    });

    describe("under error conditions", () => {
      describe("when userRepository.createUser throws an error", () => {
        beforeEach(() => {
          userRepository.createUser.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await userService.createUser(mockUserCreationInput);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in createUser", { error: mockError, userCreationInput: mockUserCreationInput }, userService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await userService.createUser(mockUserCreationInput);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getTeamsByUserId", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        userRepository.getTeamUserRelationshipsByUserId.and.returnValue(Promise.resolve([ mockTeamUserRelationship ]));
      });

      it("calls userRepository.getTeamUserRelationshipsByUserId with the correct params", async () => {
        await userService.getTeamsByUserId(mockId);

        expect(userRepository.getTeamUserRelationshipsByUserId).toHaveBeenCalledTimes(1);
        expect(userRepository.getTeamUserRelationshipsByUserId).toHaveBeenCalledWith(mockId);
      });

      it("returns the response of userRepository.getTeamUserRelationshipsByUserId with userIds stripped", async () => {
        const { userId, ...expectedTeam } = mockTeamUserRelationship;

        const users = await userService.getTeamsByUserId(mockId);

        expect(users).toEqual([ expectedTeam ]);
      });
    });

    describe("under error conditions", () => {
      describe("when userRepository.getTeamUserRelationshipsByUserId throws an error", () => {
        beforeEach(() => {
          userRepository.getTeamUserRelationshipsByUserId.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await userService.getTeamsByUserId(mockId);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getTeamsByUserId", { error: mockError, userId: mockId }, userService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await userService.getTeamsByUserId(mockId);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
