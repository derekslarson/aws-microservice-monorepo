/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, DynamoProcessorServiceInterface, Group, DynamoProcessorServiceRecord } from "@yac/util";
import { ConversationService, ConversationServiceInterface } from "../../entity-services/conversation.service";
import { EntityType } from "../../enums/entityType.enum";
import { GroupMediatorService, GroupMediatorServiceInterface } from "../../mediator-services/group.mediator.service";
import { GroupCreatedSnsService, GroupCreatedSnsServiceInterface } from "../../sns-services/groupCreated.sns.service";
import { GroupCreatedDynamoProcessorService } from "../groupCreated.dynamo.processor.service";

describe("GroupCreatedDynamoProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let groupMediatorService: Spied<GroupMediatorServiceInterface>;
  let conversationService: Spied<ConversationServiceInterface>;
  let groupCreatedSnsService: Spied<GroupCreatedSnsServiceInterface>;
  let groupCreatedDynamoProcessorService: DynamoProcessorServiceInterface;

  const mockCoreTableName = "mock-core-table-name";
  const mockConfig = { tableNames: { core: mockCoreTableName } };
  const mockGroupId = "convo-group-mock-id";
  const mockDate = new Date().toISOString();
  const mockUserOneId = "user-1";
  const mockGroupMembersId = [ mockUserOneId ];

  const mockGroup: Group = {
    id: mockGroupId,
    name: "mock-name",
    image: "mock-image",
    createdBy: mockUserOneId,
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
    conversationService = TestSupport.spyOnClass(ConversationService);

    groupCreatedDynamoProcessorService = new GroupCreatedDynamoProcessorService(loggerService, groupCreatedSnsService, groupMediatorService, conversationService, mockConfig);
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

      describe("when passed a record that isn't a group", () => {
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
        groupCreatedSnsService.sendMessage.and.returnValue(Promise.resolve());
      });

      it("calls groupMediatorService.getGroup with the correct parameters", async () => {
        await groupCreatedDynamoProcessorService.processRecord(mockRecord);

        expect(groupMediatorService.getGroup).toHaveBeenCalledTimes(1);
        expect(groupMediatorService.getGroup).toHaveBeenCalledWith({ groupId: mockGroupId });
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
    });
  });
});
