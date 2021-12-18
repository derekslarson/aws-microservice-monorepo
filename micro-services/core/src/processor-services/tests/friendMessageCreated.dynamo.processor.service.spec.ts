// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, DynamoProcessorServiceInterface, User, DynamoProcessorServiceRecord, Message } from "@yac/util";
// import { MessageService, MessageServiceInterface } from "../../entity-services/message.service";
// import { ConversationType } from "../../enums/conversationType.enum";
// import { EntityType } from "../../enums/entityType.enum";
// import { KeyPrefix } from "../../enums/keyPrefix.enum";
// import { MessageMimeType } from "../../enums/message.mimeType.enum";
// import { MessageMediatorService, MessageMediatorServiceInterface } from "../../mediator-services/message.mediator.service";

// import { FriendMessageCreatedSnsService, FriendMessageCreatedSnsServiceInterface } from "../../sns-services/friendMessageCreated.sns.service";
// import { FriendConvoId } from "../../types/friendConvoId.type";
// import { MessageId } from "../../types/messageId.type";
// import { FriendMessageCreatedDynamoProcessorService } from "../oneOnOneMessageCreated.dynamo.processor.service";

// describe("FriendMessageCreatedDynamoProcessorService", () => {
//   let loggerService: Spied<LoggerService>;
//   let friendMessageCreatedSnsService: Spied<FriendMessageCreatedSnsServiceInterface>;
//   let messageMediatorService: Spied<MessageMediatorServiceInterface>;
//   let messageService: Spied<MessageServiceInterface>;
//   let friendMessageCreatedDynamoProcessorService: DynamoProcessorServiceInterface;

//   const mockCoreTableName = "mock-core-table-name";
//   const mockConfig = { tableNames: { core: mockCoreTableName } };
//   const mockToUserId = "user-mock-id-to";
//   const mockFromUserId = "user-mock-id-from";
//   const mockMessageId: MessageId = `${KeyPrefix.Message}-id`;
//   const mockFriendConversationId: FriendConvoId = `${KeyPrefix.FriendConversation}${mockToUserId}-${mockFromUserId}`;

//   const mockToUser: User = {
//     id: mockToUserId,
//     image: "mock-image",
//   };

//   const mockFromUser: User = {
//     id: mockFromUserId,
//     image: "mock-image",
//   };

//   const mockRecord: DynamoProcessorServiceRecord = {
//     eventName: "INSERT",
//     tableName: mockCoreTableName,
//     oldImage: {},
//     newImage: {
//       entityType: EntityType.Message,
//       id: mockMessageId,
//       conversationId: mockFriendConversationId,
//       from: mockToUserId,
//     },
//   };

//   const mockMessage: Message = {
//     id: mockMessageId,
//     to: mockToUser,
//     from: mockFromUser,
//     type: ConversationType.Friend,
//     createdAt: new Date().toISOString(),
//     seenAt: { [mockToUserId]: new Date().toISOString() },
//     reactions: {},
//     replyCount: 0,
//     title: "mock-title",
//     mimeType: MessageMimeType.AudioMp3,
//     fetchUrl: "mock-fetch-url",
//   };

//   const mockError = new Error("test");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     friendMessageCreatedSnsService = TestSupport.spyOnClass(FriendMessageCreatedSnsService);
//     messageMediatorService = TestSupport.spyOnClass(MessageMediatorService);
//     messageService = TestSupport.spyOnClass(MessageService);

//     friendMessageCreatedDynamoProcessorService = new FriendMessageCreatedDynamoProcessorService(loggerService, friendMessageCreatedSnsService, messageMediatorService, messageService, mockConfig);
//   });

//   describe("determineRecordSupport", () => {
//     describe("under normal conditions", () => {
//       describe("when passed a record that fits all necessary conditions", () => {
//         it("returns true", () => {
//           const result = friendMessageCreatedDynamoProcessorService.determineRecordSupport(mockRecord);

//           expect(result).toBe(true);
//         });
//       });

//       describe("when passed a record that isn't in the core table", () => {
//         const record = {
//           ...mockRecord,
//           tableName: "test",
//         };

//         it("returns false", () => {
//           const result = friendMessageCreatedDynamoProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });

//       describe("when passed a record that isn't a message", () => {
//         const record = {
//           ...mockRecord,
//           newImage: {
//             ...mockRecord.newImage,
//             entityType: EntityType.TeamUserRelationship,
//           },
//         };

//         it("returns false", () => {
//           const result = friendMessageCreatedDynamoProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });

//       describe("when passed a record that isn't a friend message", () => {
//         const record = {
//           ...mockRecord,
//           newImage: {
//             ...mockRecord.newImage,
//             conversationId: `${KeyPrefix.Group}-id`,
//           },
//         };

//         it("returns false", () => {
//           const result = friendMessageCreatedDynamoProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });

//       describe("when passed a record that isn't an insert", () => {
//         const record = {
//           ...mockRecord,
//           eventName: "MODIFY" as const,
//         };

//         it("returns false", () => {
//           const result = friendMessageCreatedDynamoProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });
//     });
//   });

//   describe("processRecord", () => {
//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         messageMediatorService.getMessage.and.returnValue(Promise.resolve({ message: mockMessage }));
//         friendMessageCreatedSnsService.sendMessage.and.returnValue(Promise.resolve());
//       });

//       it("calls messageMediatorService.getMessage with the correct parameters", async () => {
//         await friendMessageCreatedDynamoProcessorService.processRecord(mockRecord);

//         expect(messageMediatorService.getMessage).toHaveBeenCalledTimes(1);
//         expect(messageMediatorService.getMessage).toHaveBeenCalledWith({ messageId: mockMessageId });
//       });

//       it("calls friendMessageCreatedSnsService.sendMessage with the correct parameters", async () => {
//         await friendMessageCreatedDynamoProcessorService.processRecord(mockRecord);

//         expect(friendMessageCreatedSnsService.sendMessage).toHaveBeenCalledTimes(1);
//         expect(friendMessageCreatedSnsService.sendMessage).toHaveBeenCalledWith({ message: mockMessage });
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when friendMessageCreatedSnsService.sendMessage throws an error", () => {
//         beforeEach(() => {
//           messageMediatorService.getMessage.and.returnValue(Promise.resolve({ message: mockMessage }));
//           friendMessageCreatedSnsService.sendMessage.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await friendMessageCreatedDynamoProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, friendMessageCreatedDynamoProcessorService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await friendMessageCreatedDynamoProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
