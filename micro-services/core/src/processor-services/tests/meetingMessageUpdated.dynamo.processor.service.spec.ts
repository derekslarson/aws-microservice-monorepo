/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, DynamoProcessorServiceInterface, User, DynamoProcessorServiceRecord, Message, Meeting } from "@yac/util";
import { ConversationType } from "../../enums/conversationType.enum";
import { EntityType } from "../../enums/entityType.enum";
import { KeyPrefix } from "../../enums/keyPrefix.enum";
import { MessageMimeType } from "../../enums/message.mimeType.enum";
import { MeetingMediatorService, MeetingMediatorServiceInterface } from "../../mediator-services/meeting.mediator.service";
import { MessageMediatorService, MessageMediatorServiceInterface } from "../../mediator-services/message.mediator.service";
import { UserMediatorService, UserMediatorServiceInterface } from "../../mediator-services/user.mediator.service";
import { MeetingMessageUpdatedSnsService, MeetingMessageUpdatedSnsServiceInterface } from "../../sns-services/meetingMessageUpdated.sns.service";
import { MeetingId } from "../../types/meetingId.type";
import { MessageId } from "../../types/messageId.type";
import { UserId } from "../../types/userId.type";
import { MeetingMessageUpdatedDynamoProcessorService } from "../meetingMessageUpdated.dynamo.processor.service";

describe("MeetingMessageUpdatedDynamoProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let meetingMessageUpdatedSnsService: Spied<MeetingMessageUpdatedSnsServiceInterface>;
  let userMediatorService: Spied<UserMediatorServiceInterface>;
  let meetingMediatorService: Spied<MeetingMediatorServiceInterface>;
  let messageMediatorService: Spied<MessageMediatorServiceInterface>;
  let meetingMessageUpdatedDynamoProcessorService: DynamoProcessorServiceInterface;

  const mockCoreTableName = "mock-core-table-name";
  const mockConfig = { tableNames: { core: mockCoreTableName } };
  const mockMessageId: MessageId = "message-id";
  const mockUserIdOne: UserId = "user-mock-id-one";
  const mockUserIdTwo: UserId = "user-mock-id-two";
  const mockMeetingId: MeetingId = "convo-meeting-mock-id";

  const mockUserOne: User = {
    id: mockUserIdOne,
    image: "mock-image",
  };

  const mockUserTwo: User = {
    id: mockUserIdTwo,
    image: "mock-image",
  };

  const mockMeeting: Meeting = {
    id: mockMeetingId,
    name: "mock-name",
    image: "mock-image",
    createdBy: "user-mock-id",
    createdAt: new Date().toISOString(),
    dueDate: new Date().toISOString(),
  };

  const mockRecord: DynamoProcessorServiceRecord = {
    eventName: "MODIFY",
    tableName: mockCoreTableName,
    oldImage: {},
    newImage: {
      entityType: EntityType.Message,
      id: mockMessageId,
      conversationId: mockMeetingId,
      from: mockUserIdOne,
    },
  };

  const mockMessage: Message = {
    id: mockMessageId,
    to: mockMeetingId,
    from: mockUserIdOne,
    type: ConversationType.Meeting,
    createdAt: new Date().toISOString(),
    seenAt: { [mockUserIdOne]: new Date().toISOString(), [mockUserIdTwo]: null },
    reactions: {},
    replyCount: 0,
    mimeType: MessageMimeType.AudioMp3,
    fetchUrl: "mock-fetch-url",
    fromImage: "mock-from-image",
  };

  const mockError = new Error("test");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    meetingMessageUpdatedSnsService = TestSupport.spyOnClass(MeetingMessageUpdatedSnsService);
    userMediatorService = TestSupport.spyOnClass(UserMediatorService);
    meetingMediatorService = TestSupport.spyOnClass(MeetingMediatorService);
    messageMediatorService = TestSupport.spyOnClass(MessageMediatorService);

    meetingMessageUpdatedDynamoProcessorService = new MeetingMessageUpdatedDynamoProcessorService(loggerService, meetingMessageUpdatedSnsService, userMediatorService, meetingMediatorService, messageMediatorService, mockConfig);
  });

  describe("determineRecordSupport", () => {
    describe("under normal conditions", () => {
      describe("when passed a record that fits all necessary conditions", () => {
        it("returns true", () => {
          const result = meetingMessageUpdatedDynamoProcessorService.determineRecordSupport(mockRecord);

          expect(result).toBe(true);
        });
      });

      describe("when passed a record that isn't in the core table", () => {
        const record = {
          ...mockRecord,
          tableName: "test",
        };

        it("returns false", () => {
          const result = meetingMessageUpdatedDynamoProcessorService.determineRecordSupport(record);

          expect(result).toBe(false);
        });
      });

      describe("when passed a record that isn't a message", () => {
        const record = {
          ...mockRecord,
          newImage: {
            ...mockRecord.newImage,
            entityType: EntityType.TeamUserRelationship,
          },
        };

        it("returns false", () => {
          const result = meetingMessageUpdatedDynamoProcessorService.determineRecordSupport(record);

          expect(result).toBe(false);
        });
      });

      describe("when passed a record that isn't a meeting message", () => {
        const record = {
          ...mockRecord,
          newImage: {
            ...mockRecord.newImage,
            conversationId: `${KeyPrefix.FriendConversation}-id`,
          },
        };

        it("returns false", () => {
          const result = meetingMessageUpdatedDynamoProcessorService.determineRecordSupport(record);

          expect(result).toBe(false);
        });
      });

      describe("when passed a record that isn't an update", () => {
        const record = {
          ...mockRecord,
          eventName: "INSERT" as const,
        };

        it("returns false", () => {
          const result = meetingMessageUpdatedDynamoProcessorService.determineRecordSupport(record);

          expect(result).toBe(false);
        });
      });
    });
  });

  describe("processRecord", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        userMediatorService.getUser.and.returnValue(Promise.resolve({ user: mockUserOne }));
        userMediatorService.getUsersByMeetingId.and.returnValue(Promise.resolve({ users: [ mockUserOne, mockUserTwo ] }));
        meetingMediatorService.getMeeting.and.returnValue(Promise.resolve({ meeting: mockMeeting }));
        messageMediatorService.getMessage.and.returnValue(Promise.resolve({ message: mockMessage }));
        meetingMessageUpdatedSnsService.sendMessage.and.returnValue(Promise.resolve());
      });

      it("calls messageMediatorService.getMessage with the correct parameters", async () => {
        await meetingMessageUpdatedDynamoProcessorService.processRecord(mockRecord);

        expect(messageMediatorService.getMessage).toHaveBeenCalledTimes(1);
        expect(messageMediatorService.getMessage).toHaveBeenCalledWith({ messageId: mockMessageId });
      });

      it("calls userMediatorService.getUser with the correct parameters", async () => {
        await meetingMessageUpdatedDynamoProcessorService.processRecord(mockRecord);

        expect(userMediatorService.getUser).toHaveBeenCalledTimes(1);
        expect(userMediatorService.getUser).toHaveBeenCalledWith({ userId: mockUserIdOne });
      });

      it("calls userMediatorService.getUsersByMeetingId with the correct parameters", async () => {
        await meetingMessageUpdatedDynamoProcessorService.processRecord(mockRecord);

        expect(userMediatorService.getUsersByMeetingId).toHaveBeenCalledTimes(1);
        expect(userMediatorService.getUsersByMeetingId).toHaveBeenCalledWith({ meetingId: mockMeetingId });
      });

      it("calls meetingMediatorService.getMeeting with the correct parameters", async () => {
        await meetingMessageUpdatedDynamoProcessorService.processRecord(mockRecord);

        expect(meetingMediatorService.getMeeting).toHaveBeenCalledTimes(1);
        expect(meetingMediatorService.getMeeting).toHaveBeenCalledWith({ meetingId: mockMeetingId });
      });

      it("calls meetingMessageUpdatedSnsService.sendMessage with the correct parameters", async () => {
        await meetingMessageUpdatedDynamoProcessorService.processRecord(mockRecord);

        expect(meetingMessageUpdatedSnsService.sendMessage).toHaveBeenCalledTimes(1);
        expect(meetingMessageUpdatedSnsService.sendMessage).toHaveBeenCalledWith({ to: mockMeeting, from: mockUserOne, message: mockMessage, meetingMemberIds: [ mockUserIdOne, mockUserIdTwo ] });
      });
    });

    describe("under error conditions", () => {
      describe("when meetingMessageUpdatedSnsService.sendMessage throws an error", () => {
        beforeEach(() => {
          userMediatorService.getUser.and.returnValue(Promise.resolve({ user: mockUserOne }));
          userMediatorService.getUsersByMeetingId.and.returnValue(Promise.resolve({ users: [ mockUserOne, mockUserTwo ] }));
          meetingMediatorService.getMeeting.and.returnValue(Promise.resolve({ meeting: mockMeeting }));
          messageMediatorService.getMessage.and.returnValue(Promise.resolve({ message: mockMessage }));
          meetingMessageUpdatedSnsService.sendMessage.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await meetingMessageUpdatedDynamoProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, meetingMessageUpdatedDynamoProcessorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await meetingMessageUpdatedDynamoProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
