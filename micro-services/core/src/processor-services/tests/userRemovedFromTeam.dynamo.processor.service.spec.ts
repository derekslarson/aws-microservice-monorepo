/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, DynamoProcessorServiceInterface, User, Team, DynamoProcessorServiceRecord } from "@yac/util";
import { EntityType } from "../../enums/entityType.enum";
import { TeamMediatorService, TeamMediatorServiceInterface } from "../../mediator-services/team.mediator.service";
import { UserMediatorService, UserMediatorServiceInterface } from "../../mediator-services/user.mediator.service";
import { UserRemovedFromTeamSnsService, UserRemovedFromTeamSnsServiceInterface } from "../../sns-services/userRemovedFromTeam.sns.service";
import { UserRemovedFromTeamDynamoProcessorService } from "../userRemovedFromTeam.dynamo.processor.service";

describe("UserRemovedFromTeamDynamoProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let userRemovedFromTeamSnsService: Spied<UserRemovedFromTeamSnsServiceInterface>;
  let teamMediatorService: Spied<TeamMediatorServiceInterface>;
  let userMediatorService: Spied<UserMediatorServiceInterface>;
  let userRemovedFromTeamDynamoProcessorService: DynamoProcessorServiceInterface;

  const mockCoreTableName = "mock-core-table-name";
  const mockConfig = { tableNames: { core: mockCoreTableName } };
  const mockUserIdOne = "user-mock-id-one";
  const mockUserIdTwo = "user-mock-id-two";
  const mockTeamId = "team-mock-id";

  const mockUserOne: User = {
    id: mockUserIdOne,
    image: "mock-image",
  };

  const mockUserTwo: User = {
    id: mockUserIdTwo,
    image: "mock-image",
  };

  const mockTeam: Team = {
    id: mockTeamId,
    name: "mock-name",
    image: "mock-image",
    createdBy: "user-mock-id",
  };

  const mockRecord: DynamoProcessorServiceRecord = {
    eventName: "REMOVE",
    tableName: mockCoreTableName,
    newImage: {},
    oldImage: {
      entityType: EntityType.TeamUserRelationship,
      teamId: mockTeamId,
      userId: mockUserIdOne,
    },
  };

  const mockError = new Error("test");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    userRemovedFromTeamSnsService = TestSupport.spyOnClass(UserRemovedFromTeamSnsService);
    teamMediatorService = TestSupport.spyOnClass(TeamMediatorService);
    userMediatorService = TestSupport.spyOnClass(UserMediatorService);

    userRemovedFromTeamDynamoProcessorService = new UserRemovedFromTeamDynamoProcessorService(loggerService, userRemovedFromTeamSnsService, teamMediatorService, userMediatorService, mockConfig);
  });

  describe("determineRecordSupport", () => {
    describe("under normal conditions", () => {
      describe("when passed a record that fits all necessary conditions", () => {
        it("returns true", () => {
          const result = userRemovedFromTeamDynamoProcessorService.determineRecordSupport(mockRecord);

          expect(result).toBe(true);
        });
      });

      describe("when passed a record that isn't in the core table", () => {
        const record = {
          ...mockRecord,
          tableName: "test",
        };

        it("returns false", () => {
          const result = userRemovedFromTeamDynamoProcessorService.determineRecordSupport(record);

          expect(result).toBe(false);
        });
      });

      describe("when passed a record that isn't a team-user-relationship", () => {
        const record = {
          ...mockRecord,
          oldImage: {
            ...mockRecord.oldImage,
            entityType: EntityType.Team,
          },
        };

        it("returns false", () => {
          const result = userRemovedFromTeamDynamoProcessorService.determineRecordSupport(record);

          expect(result).toBe(false);
        });
      });

      describe("when passed a record that isn't a removal", () => {
        const record = {
          ...mockRecord,
          eventName: "MODIFY" as const,
        };

        it("returns false", () => {
          const result = userRemovedFromTeamDynamoProcessorService.determineRecordSupport(record);

          expect(result).toBe(false);
        });
      });
    });
  });

  describe("processRecord", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        userMediatorService.getUsersByTeamId.and.returnValue(Promise.resolve({ users: [ mockUserOne, mockUserTwo ] }));
        userMediatorService.getUser.and.returnValue(Promise.resolve({ user: mockUserOne }));
        teamMediatorService.getTeam.and.returnValue(Promise.resolve({ team: mockTeam }));
        userRemovedFromTeamSnsService.sendMessage.and.returnValue(Promise.resolve());
      });

      it("calls userMediatorService.getUsersByTeamId with the correct parameters", async () => {
        await userRemovedFromTeamDynamoProcessorService.processRecord(mockRecord);

        expect(userMediatorService.getUsersByTeamId).toHaveBeenCalledTimes(1);
        expect(userMediatorService.getUsersByTeamId).toHaveBeenCalledWith({ teamId: mockTeamId });
      });

      it("calls userMediatorService.getUser with the correct parameters", async () => {
        await userRemovedFromTeamDynamoProcessorService.processRecord(mockRecord);

        expect(userMediatorService.getUser).toHaveBeenCalledTimes(1);
        expect(userMediatorService.getUser).toHaveBeenCalledWith({ userId: mockUserIdOne });
      });

      it("calls teamMediatorService.getTeam with the correct parameters", async () => {
        await userRemovedFromTeamDynamoProcessorService.processRecord(mockRecord);

        expect(teamMediatorService.getTeam).toHaveBeenCalledTimes(1);
        expect(teamMediatorService.getTeam).toHaveBeenCalledWith({ teamId: mockTeamId });
      });

      it("calls teamMediatorService.getTeam with the correct parameters", async () => {
        await userRemovedFromTeamDynamoProcessorService.processRecord(mockRecord);

        expect(teamMediatorService.getTeam).toHaveBeenCalledTimes(1);
        expect(teamMediatorService.getTeam).toHaveBeenCalledWith({ teamId: mockTeamId });
      });

      it("calls userRemovedFromTeamSnsService.sendMessage with the correct parameters", async () => {
        await userRemovedFromTeamDynamoProcessorService.processRecord(mockRecord);

        expect(userRemovedFromTeamSnsService.sendMessage).toHaveBeenCalledTimes(1);
        expect(userRemovedFromTeamSnsService.sendMessage).toHaveBeenCalledWith({ team: mockTeam, user: mockUserOne, teamMemberIds: [ mockUserIdOne, mockUserIdTwo ] });
      });
    });

    describe("under error conditions", () => {
      describe("when userMediatorService.getUsersByTeamId throws an error", () => {
        beforeEach(() => {
          userMediatorService.getUsersByTeamId.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await userRemovedFromTeamDynamoProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, userRemovedFromTeamDynamoProcessorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await userRemovedFromTeamDynamoProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
