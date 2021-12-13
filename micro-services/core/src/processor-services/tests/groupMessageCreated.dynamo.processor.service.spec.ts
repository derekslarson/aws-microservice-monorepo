// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, DynamoProcessorServiceInterface, User, DynamoProcessorServiceRecord, Message, Group } from "@yac/util";
// import { MessageService, MessageServiceInterface } from "../../entity-services/message.service";
// import { ConversationType } from "../../enums/conversationType.enum";
// import { EntityType } from "../../enums/entityType.enum";
// import { KeyPrefix } from "../../enums/keyPrefix.enum";
// import { MessageMimeType } from "../../enums/message.mimeType.enum";
// import { MessageMediatorService, MessageMediatorServiceInterface } from "../../mediator-services/message.mediator.service";
// import { UserMediatorService, UserMediatorServiceInterface } from "../../mediator-services/user.mediator.service";
// import { GroupMessageCreatedSnsService, GroupMessageCreatedSnsServiceInterface } from "../../sns-services/groupMessageCreated.sns.service";
// import { GroupId } from "../../types/groupId.type";
// import { MessageId } from "../../types/messageId.type";
// import { UserId } from "../../types/userId.type";
// import { GroupMessageCreatedDynamoProcessorService } from "../groupMessageCreated.dynamo.processor.service";

// describe("GroupMessageCreatedDynamoProcessorService", () => {
//   let loggerService: Spied<LoggerService>;
//   let groupMessageCreatedSnsService: Spied<GroupMessageCreatedSnsServiceInterface>;
//   let userMediatorService: Spied<UserMediatorServiceInterface>;
//   let messageMediatorService: Spied<MessageMediatorServiceInterface>;
//   let messageService: Spied<MessageServiceInterface>;
//   let groupMessageCreatedDynamoProcessorService: DynamoProcessorServiceInterface;

//   const mockCoreTableName = "mock-core-table-name";
//   const mockConfig = { tableNames: { core: mockCoreTableName } };
//   const mockMessageId: MessageId = "message-id";
//   const mockUserIdOne: UserId = "user-mock-id-one";
//   const mockUserIdTwo: UserId = "user-mock-id-two";
//   const mockGroupId: GroupId = "group_mock-id";

//   const mockUserOne: User = {
//     id: mockUserIdOne,
//     image: "mock-image",
//   };

//   const mockUserTwo: User = {
//     id: mockUserIdTwo,
//     image: "mock-image",
//   };

//   const mockGroup: Group = {
//     id: mockGroupId,
//     name: "mock-name",
//     image: "mock-image",
//     createdBy: "user-mock-id",
//     createdAt: new Date().toISOString(),
//   };

//   const mockRecord: DynamoProcessorServiceRecord = {
//     eventName: "INSERT",
//     tableName: mockCoreTableName,
//     oldImage: {},
//     newImage: {
//       entityType: EntityType.Message,
//       id: mockMessageId,
//       conversationId: mockGroupId,
//       from: mockUserIdOne,
//     },
//   };

//   const mockMessage: Message = {
//     id: mockMessageId,
//     to: mockGroup,
//     from: mockUserOne,
//     type: ConversationType.Group,
//     createdAt: new Date().toISOString(),
//     seenAt: { [mockUserIdOne]: new Date().toISOString(), [mockUserIdTwo]: null },
//     reactions: {},
//     replyCount: 0,
//     title: "mock-title",
//     mimeType: MessageMimeType.AudioMp3,
//     fetchUrl: "mock-fetch-url",
//   };

//   const mockError = new Error("test");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     groupMessageCreatedSnsService = TestSupport.spyOnClass(GroupMessageCreatedSnsService);
//     userMediatorService = TestSupport.spyOnClass(UserMediatorService);
//     messageMediatorService = TestSupport.spyOnClass(MessageMediatorService);
//     messageService = TestSupport.spyOnClass(MessageService);

//     groupMessageCreatedDynamoProcessorService = new GroupMessageCreatedDynamoProcessorService(loggerService, groupMessageCreatedSnsService, userMediatorService, messageMediatorService, messageService, mockConfig);
//   });

//   describe("determineRecordSupport", () => {
//     describe("under normal conditions", () => {
//       describe("when passed a record that fits all necessary conditions", () => {
//         it("returns true", () => {
//           const result = groupMessageCreatedDynamoProcessorService.determineRecordSupport(mockRecord);

//           expect(result).toBe(true);
//         });
//       });

//       describe("when passed a record that isn't in the core table", () => {
//         const record = {
//           ...mockRecord,
//           tableName: "test",
//         };

//         it("returns false", () => {
//           const result = groupMessageCreatedDynamoProcessorService.determineRecordSupport(record);

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
//           const result = groupMessageCreatedDynamoProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });

//       describe("when passed a record that isn't a group message", () => {
//         const record = {
//           ...mockRecord,
//           newImage: {
//             ...mockRecord.newImage,
//             conversationId: `${KeyPrefix.FriendConversation}-id`,
//           },
//         };

//         it("returns false", () => {
//           const result = groupMessageCreatedDynamoProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });

//       describe("when passed a record that isn't an insert", () => {
//         const record = {
//           ...mockRecord,
//           eventName: "MODIFY" as const,
//         };

//         it("returns false", () => {
//           const result = groupMessageCreatedDynamoProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });
//     });
//   });

//   describe("processRecord", () => {
//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         userMediatorService.getUsersByGroupId.and.returnValue(Promise.resolve({ users: [ mockUserOne, mockUserTwo ] }));
//         messageMediatorService.getMessage.and.returnValue(Promise.resolve({ message: mockMessage }));
//         groupMessageCreatedSnsService.sendMessage.and.returnValue(Promise.resolve());
//       });

//       it("calls messageMediatorService.getMessage with the correct parameters", async () => {
//         await groupMessageCreatedDynamoProcessorService.processRecord(mockRecord);

//         expect(messageMediatorService.getMessage).toHaveBeenCalledTimes(1);
//         expect(messageMediatorService.getMessage).toHaveBeenCalledWith({ messageId: mockMessageId });
//       });

//       it("calls userMediatorService.getUsersByGroupId with the correct parameters", async () => {
//         await groupMessageCreatedDynamoProcessorService.processRecord(mockRecord);

//         expect(userMediatorService.getUsersByGroupId).toHaveBeenCalledTimes(1);
//         expect(userMediatorService.getUsersByGroupId).toHaveBeenCalledWith({ groupId: mockGroupId });
//       });

//       it("calls groupMessageCreatedSnsService.sendMessage with the correct parameters", async () => {
//         await groupMessageCreatedDynamoProcessorService.processRecord(mockRecord);

//         expect(groupMessageCreatedSnsService.sendMessage).toHaveBeenCalledTimes(1);
//         expect(groupMessageCreatedSnsService.sendMessage).toHaveBeenCalledWith({ message: mockMessage, groupMemberIds: [ mockUserIdOne, mockUserIdTwo ] });
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when groupMessageCreatedSnsService.sendMessage throws an error", () => {
//         beforeEach(() => {
//           userMediatorService.getUsersByGroupId.and.returnValue(Promise.resolve({ users: [ mockUserOne, mockUserTwo ] }));
//           messageMediatorService.getMessage.and.returnValue(Promise.resolve({ message: mockMessage }));
//           groupMessageCreatedSnsService.sendMessage.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await groupMessageCreatedDynamoProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, groupMessageCreatedDynamoProcessorService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await groupMessageCreatedDynamoProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
