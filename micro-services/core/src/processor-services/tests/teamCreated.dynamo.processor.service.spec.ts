/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, DynamoProcessorServiceInterface, User, Team, DynamoProcessorServiceRecord } from "@yac/util";
import { EntityType } from "../../enums/entityType.enum";
import { TeamMediatorService, TeamMediatorServiceInterface } from "../../mediator-services/team.mediator.service";
import { UserMediatorService, UserMediatorServiceInterface } from "../../mediator-services/user.mediator.service";
import { TeamCreatedSnsService } from "../../sns-services/teamCreated.sns.service";
import { TeamCreatedDynamoProcessorService } from "../teamCreated.dynamo.processor.service";

describe("UserRemovedFromTeamDynamoProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let teamMediatorService: Spied<TeamMediatorServiceInterface>;
  let teamCreatedSnsService: Spied<TeamCreatedSnsService>;
  let userMediatorService: Spied<UserMediatorServiceInterface>;
  let teamCreatedDynamoProcessorService: DynamoProcessorServiceInterface;

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
    eventName: "INSERT",
    tableName: mockCoreTableName,
    oldImage: {},
    newImage: {
      entityType: EntityType.Team,
      ...mockTeam,
    },
  };

  const mockError = new Error("test");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    teamCreatedSnsService = TestSupport.spyOnClass(TeamCreatedSnsService);
    teamMediatorService = TestSupport.spyOnClass(TeamMediatorService);
    userMediatorService = TestSupport.spyOnClass(UserMediatorService);

    teamCreatedDynamoProcessorService = new TeamCreatedDynamoProcessorService(loggerService, teamCreatedSnsService, teamMediatorService, userMediatorService, mockConfig);
  });

  describe("determineRecordSupport", () => {
    describe("under normal conditions", () => {
      describe("when passed a record that fits all necessary conditions", () => {
        it("returns true", () => {
          const result = teamCreatedDynamoProcessorService.determineRecordSupport(mockRecord);

          expect(result).toBe(true);
        });
      });

      describe("when passed a record that isn't in the core table", () => {
        const record = {
          ...mockRecord,
          tableName: "test",
        };

        it("returns false", () => {
          const result = teamCreatedDynamoProcessorService.determineRecordSupport(record);

          expect(result).toBe(false);
        });
      });

      describe("when passed a record that isn't a team", () => {
        const record = {
          ...mockRecord,
          newImage: {
            ...mockRecord.newImage,
            entityType: EntityType.Team,
          },
        };

        it("returns false", () => {
          const result = teamCreatedDynamoProcessorService.determineRecordSupport(record);

          expect(result).toBe(false);
        });
      });

      describe("when passed a record that isn't an insert", () => {
        const record = {
          ...mockRecord,
          eventName: "MODIFY" as const,
        };

        it("returns false", () => {
          const result = teamCreatedDynamoProcessorService.determineRecordSupport(record);

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
        teamCreatedSnsService.sendMessage.and.returnValue(Promise.resolve());
      });

      it("calls userMediatorService.getUsersByTeamId with the correct parameters", async () => {
        await teamCreatedDynamoProcessorService.processRecord(mockRecord);

        expect(userMediatorService.getUsersByTeamId).toHaveBeenCalledTimes(1);
        expect(userMediatorService.getUsersByTeamId).toHaveBeenCalledWith({ teamId: mockTeamId });
      });

      it("calls teamMediatorService.getTeam with the correct parameters", async () => {
        await teamCreatedDynamoProcessorService.processRecord(mockRecord);

        expect(teamMediatorService.getTeam).toHaveBeenCalledTimes(1);
        expect(teamMediatorService.getTeam).toHaveBeenCalledWith({ teamId: mockTeamId });
      });

      it("calls teamCreatedSnsService.sendMessage with the correct parameters", async () => {
        await teamCreatedDynamoProcessorService.processRecord(mockRecord);

        expect(teamCreatedSnsService.sendMessage).toHaveBeenCalledTimes(1);
        expect(teamCreatedSnsService.sendMessage).toHaveBeenCalledWith({ team: mockTeam, teamMemberIds: [ mockUserIdOne, mockUserIdTwo ] });
      });
    });

    describe("under error conditions", () => {
      describe("when userMediatorService.getUsersByTeamId throws an error", () => {
        beforeEach(() => {
          userMediatorService.getUsersByTeamId.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await teamCreatedDynamoProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, teamCreatedDynamoProcessorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamCreatedDynamoProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
