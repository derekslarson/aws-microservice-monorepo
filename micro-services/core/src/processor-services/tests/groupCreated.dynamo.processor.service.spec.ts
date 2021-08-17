/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, DynamoProcessorServiceInterface, Group, DynamoProcessorServiceRecord, User } from "@yac/util";
import { EntityType } from "../../enums/entityType.enum";
import { GroupMediatorService, GroupMediatorServiceInterface } from "../../mediator-services/group.mediator.service";
import { UserMediatorService, UserMediatorServiceInterface } from "../../mediator-services/user.mediator.service";
import { GroupCreatedSnsService, GroupCreatedSnsServiceInterface } from "../../sns-services/groupCreated.sns.service";
import { GroupCreatedDynamoProcessorService } from "../groupCreated.dynamo.processor.service";

describe("GroupCreatedDynamoProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let groupMediatorService: Spied<GroupMediatorServiceInterface>;
  let groupCreatedSnsService: Spied<GroupCreatedSnsServiceInterface>;
  let userMediatorService: Spied<UserMediatorServiceInterface>;
  let groupCreatedDynamoProcessorService: DynamoProcessorServiceInterface;

  const mockCoreTableName = "mock-core-table-name";
  const mockConfig = { tableNames: { core: mockCoreTableName } };
  const mockGroupId = "convo-group-mock-id";
  const mockDate = new Date().toISOString();
  const mockUser1Id = "user-1";
  const mockUser2Id = "user-2";
  const mockGroupMembersId = [ mockUser2Id, mockUser1Id ];

  const mockUser1: User = {
    id: mockUser1Id,
    username: "mock-username",
    image: "mock-image",
    email: "mock-email",
  };

  const mockUser2: User = {
    id: mockUser2Id,
    username: "mock-username",
    image: "mock-image",
    email: "mock-email",
  };

  const mockGroup: Group = {
    id: mockGroupId,
    name: "mock-name",
    image: "mock-image",
    createdBy: "user-mock-id",
    createdAt: mockDate,
  };

  const mockRecord: DynamoProcessorServiceRecord = {
    eventName: "INSERT",
    tableName: mockCoreTableName,
    oldImage: {},
    newImage: {
      entityType: EntityType.GroupConversation,
      ...mockGroup,
    },
  };

  const mockError = new Error("test");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    groupCreatedSnsService = TestSupport.spyOnClass(GroupCreatedSnsService);
    groupMediatorService = TestSupport.spyOnClass(GroupMediatorService);
    userMediatorService = TestSupport.spyOnClass(UserMediatorService);

    groupCreatedDynamoProcessorService = new GroupCreatedDynamoProcessorService(loggerService, groupCreatedSnsService, groupMediatorService, userMediatorService, mockConfig);
  });

  describe("determineRecordSupport", () => {
    describe("under normal conditions", () => {
      describe("when passed a record that fits all necessary conditions", () => {
        it("returns true", () => {
          const result = groupCreatedDynamoProcessorService.determineRecordSupport(mockRecord);

          expect(result).toBe(true);
        });
      });

      describe("when passed a record that isn't in the core table", () => {
        const record = {
          ...mockRecord,
          tableName: "test",
        };

        it("returns false", () => {
          const result = groupCreatedDynamoProcessorService.determineRecordSupport(record);

          expect(result).toBe(false);
        });
      });

      describe("when passed a record that isn't a team", () => {
        const record = {
          ...mockRecord,
          newImage: {
            ...mockRecord.newImage,
            entityType: EntityType.User,
          },
        };

        it("returns false", () => {
          const result = groupCreatedDynamoProcessorService.determineRecordSupport(record);

          expect(result).toBe(false);
        });
      });

      describe("when passed a record that isn't an insert", () => {
        const record = {
          ...mockRecord,
          eventName: "MODIFY" as const,
        };

        it("returns false", () => {
          const result = groupCreatedDynamoProcessorService.determineRecordSupport(record);

          expect(result).toBe(false);
        });
      });
    });
  });

  describe("processRecord", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        groupMediatorService.getGroup.and.returnValue(Promise.resolve({ group: mockGroup }));
        userMediatorService.getUsersByGroupId.and.returnValue(Promise.resolve({ users: [ mockUser2, mockUser1 ] }));
        groupCreatedSnsService.sendMessage.and.returnValue(Promise.resolve());
      });

      it("calls groupMediatorService.getGroup with the correct parameters", async () => {
        await groupCreatedDynamoProcessorService.processRecord(mockRecord);

        expect(groupMediatorService.getGroup).toHaveBeenCalledTimes(1);
        expect(groupMediatorService.getGroup).toHaveBeenCalledWith({ groupId: mockGroupId });
      });

      it("calls userMediatorService.getUsersByGroupId with the correct parameters", async () => {
        await groupCreatedDynamoProcessorService.processRecord(mockRecord);

        expect(userMediatorService.getUsersByGroupId).toHaveBeenCalledTimes(1);
        expect(userMediatorService.getUsersByGroupId).toHaveBeenCalledWith({ groupId: mockGroupId });
      });

      it("calls groupCreatedSnsService.sendMessage with the correct parameters", async () => {
        await groupCreatedDynamoProcessorService.processRecord(mockRecord);

        expect(groupCreatedSnsService.sendMessage).toHaveBeenCalledTimes(1);
        expect(groupCreatedSnsService.sendMessage).toHaveBeenCalledWith({ group: mockGroup, groupMemberIds: mockGroupMembersId });
      });
    });

    describe("under error conditions", () => {
      describe("when groupMediatorService.getGroup throws an error", () => {
        beforeEach(() => {
          groupMediatorService.getGroup.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await groupCreatedDynamoProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, groupCreatedDynamoProcessorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await groupCreatedDynamoProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });

      describe("when userMediatorService.getUsersByGroupId throws an error", () => {
        beforeEach(() => {
          groupMediatorService.getGroup.and.returnValue(Promise.resolve({ group: mockGroup }));
          userMediatorService.getUsersByGroupId.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await groupCreatedDynamoProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, groupCreatedDynamoProcessorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await groupCreatedDynamoProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
