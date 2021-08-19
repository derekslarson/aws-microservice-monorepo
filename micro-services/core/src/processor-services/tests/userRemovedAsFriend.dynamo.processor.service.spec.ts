/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, DynamoProcessorServiceInterface, User, DynamoProcessorServiceRecord } from "@yac/util";
import { EntityType } from "../../enums/entityType.enum";
import { KeyPrefix } from "../../enums/keyPrefix.enum";
import { UserMediatorService, UserMediatorServiceInterface } from "../../mediator-services/user.mediator.service";
import { UserRemovedAsFriendSnsService, UserRemovedAsFriendSnsServiceInterface } from "../../sns-services/userRemovedAsFriend.sns.service";
import { FriendConvoId } from "../../types/friendConvoId.type";
import { UserRemovedAsFriendDynamoProcessorService } from "../userRemovedAsFriend.dynamo.processor.service";

describe("UserRemovedAsFriendDynamoProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let userRemovedAsFriendSnsService: Spied<UserRemovedAsFriendSnsServiceInterface>;
  let userMediatorService: Spied<UserMediatorServiceInterface>;
  let userRemovedAsFriendDynamoProcessorService: DynamoProcessorServiceInterface;

  const mockCoreTableName = "mock-core-table-name";
  const mockConfig = { tableNames: { core: mockCoreTableName } };
  const mockUserIdOne = "user-mock-id-one";
  const mockUserIdTwo = "user-mock-id-two";
  const mockFriendConversationId: FriendConvoId = `${KeyPrefix.FriendConversation}${mockUserIdOne}-${mockUserIdTwo}`;

  const mockUserOne: User = {
    id: mockUserIdOne,
    image: "mock-image",
  };

  const mockUserTwo: User = {
    id: mockUserIdTwo,
    image: "mock-image",
  };

  const mockRecord: DynamoProcessorServiceRecord = {
    eventName: "REMOVE",
    tableName: mockCoreTableName,
    newImage: {},
    oldImage: {
      entityType: EntityType.FriendConversation,
      id: mockFriendConversationId,
      createdBy: mockUserIdOne,
    },
  };

  const mockError = new Error("test");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    userRemovedAsFriendSnsService = TestSupport.spyOnClass(UserRemovedAsFriendSnsService);
    userMediatorService = TestSupport.spyOnClass(UserMediatorService);

    userRemovedAsFriendDynamoProcessorService = new UserRemovedAsFriendDynamoProcessorService(loggerService, userRemovedAsFriendSnsService, userMediatorService, mockConfig);
  });

  describe("determineRecordSupport", () => {
    describe("under normal conditions", () => {
      describe("when passed a record that fits all necessary conditions", () => {
        it("returns true", () => {
          const result = userRemovedAsFriendDynamoProcessorService.determineRecordSupport(mockRecord);

          expect(result).toBe(true);
        });
      });

      describe("when passed a record that isn't in the core table", () => {
        const record = {
          ...mockRecord,
          tableName: "test",
        };

        it("returns false", () => {
          const result = userRemovedAsFriendDynamoProcessorService.determineRecordSupport(record);

          expect(result).toBe(false);
        });
      });

      describe("when passed a record that isn't a friend-conversation", () => {
        const record = {
          ...mockRecord,
          oldImage: {
            ...mockRecord.oldImage,
            entityType: EntityType.TeamUserRelationship,
          },
        };

        it("returns false", () => {
          const result = userRemovedAsFriendDynamoProcessorService.determineRecordSupport(record);

          expect(result).toBe(false);
        });
      });

      describe("when passed a record that isn't a removal", () => {
        const record = {
          ...mockRecord,
          eventName: "MODIFY" as const,
        };

        it("returns false", () => {
          const result = userRemovedAsFriendDynamoProcessorService.determineRecordSupport(record);

          expect(result).toBe(false);
        });
      });
    });
  });

  describe("processRecord", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        userMediatorService.getUser.and.returnValues(Promise.resolve({ user: mockUserOne }), Promise.resolve({ user: mockUserTwo }));
        userRemovedAsFriendSnsService.sendMessage.and.returnValue(Promise.resolve());
      });

      it("calls userMediatorService.getUser with the correct parameters", async () => {
        await userRemovedAsFriendDynamoProcessorService.processRecord(mockRecord);

        expect(userMediatorService.getUser).toHaveBeenCalledTimes(2);
        expect(userMediatorService.getUser).toHaveBeenCalledWith({ userId: mockUserIdOne });
        expect(userMediatorService.getUser).toHaveBeenCalledWith({ userId: mockUserIdTwo });
      });

      it("calls userRemovedAsFriendSnsService.sendMessage with the correct parameters", async () => {
        await userRemovedAsFriendDynamoProcessorService.processRecord(mockRecord);

        expect(userRemovedAsFriendSnsService.sendMessage).toHaveBeenCalledTimes(1);
        expect(userRemovedAsFriendSnsService.sendMessage).toHaveBeenCalledWith({ userA: mockUserOne, userB: mockUserTwo });
      });
    });

    describe("under error conditions", () => {
      describe("when userRemovedAsFriendSnsService.sendMessage throws an error", () => {
        beforeEach(() => {
          userMediatorService.getUser.and.returnValues(Promise.resolve({ user: mockUserOne }), Promise.resolve({ user: mockUserTwo }));
          userRemovedAsFriendSnsService.sendMessage.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await userRemovedAsFriendDynamoProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, userRemovedAsFriendDynamoProcessorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await userRemovedAsFriendDynamoProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
