// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, DynamoProcessorServiceInterface, User, Meeting, DynamoProcessorServiceRecord } from "@yac/util";
// import { ConversationType } from "../../enums/conversationType.enum";
// import { EntityType } from "../../enums/entityType.enum";
// import { MeetingMediatorService, MeetingMediatorServiceInterface } from "../../mediator-services/meeting.mediator.service";
// import { UserMediatorService, UserMediatorServiceInterface } from "../../mediator-services/user.mediator.service";
// import { UserRemovedFromMeetingSnsService, UserRemovedFromMeetingSnsServiceInterface } from "../../sns-services/userRemovedFromMeeting.sns.service";
// import { UserRemovedFromMeetingDynamoProcessorService } from "../userRemovedFromMeeting.dynamo.processor.service";

// describe("UserRemovedFromMeetingDynamoProcessorService", () => {
//   let loggerService: Spied<LoggerService>;
//   let userRemovedFromMeetingSnsService: Spied<UserRemovedFromMeetingSnsServiceInterface>;
//   let meetingMediatorService: Spied<MeetingMediatorServiceInterface>;
//   let userMediatorService: Spied<UserMediatorServiceInterface>;
//   let userRemovedFromMeetingDynamoProcessorService: DynamoProcessorServiceInterface;

//   const mockCoreTableName = "mock-core-table-name";
//   const mockConfig = { tableNames: { core: mockCoreTableName } };
//   const mockUserIdOne = "user-mock-id-one";
//   const mockUserIdTwo = "user-mock-id-two";
//   const mockMeetingId = "meeting_mock-id";

//   const mockUserOne: User = {
//     id: mockUserIdOne,
//     image: "mock-image",
//   };

//   const mockUserTwo: User = {
//     id: mockUserIdTwo,
//     image: "mock-image",
//   };

//   const mockMeeting: Meeting = {
//     id: mockMeetingId,
//     name: "mock-name",
//     image: "mock-image",
//     createdBy: "user_mock-id",
//     createdAt: new Date().toISOString(),
//     dueDate: new Date().toISOString(),
//   };

//   const mockRecord: DynamoProcessorServiceRecord = {
//     eventName: "REMOVE",
//     tableName: mockCoreTableName,
//     newImage: {},
//     oldImage: {
//       entityType: EntityType.ConversationUserRelationship,
//       type: ConversationType.Meeting,
//       conversationId: mockMeetingId,
//       userId: mockUserIdOne,
//     },
//   };

//   const mockError = new Error("test");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     userRemovedFromMeetingSnsService = TestSupport.spyOnClass(UserRemovedFromMeetingSnsService);
//     meetingMediatorService = TestSupport.spyOnClass(MeetingMediatorService);
//     userMediatorService = TestSupport.spyOnClass(UserMediatorService);

//     userRemovedFromMeetingDynamoProcessorService = new UserRemovedFromMeetingDynamoProcessorService(loggerService, userRemovedFromMeetingSnsService, meetingMediatorService, userMediatorService, mockConfig);
//   });

//   describe("determineRecordSupport", () => {
//     describe("under normal conditions", () => {
//       describe("when passed a record that fits all necessary conditions", () => {
//         it("returns true", () => {
//           const result = userRemovedFromMeetingDynamoProcessorService.determineRecordSupport(mockRecord);

//           expect(result).toBe(true);
//         });
//       });

//       describe("when passed a record that isn't in the core table", () => {
//         const record = {
//           ...mockRecord,
//           tableName: "test",
//         };

//         it("returns false", () => {
//           const result = userRemovedFromMeetingDynamoProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });

//       describe("when passed a record that isn't a conversation-user-relationship", () => {
//         const record = {
//           ...mockRecord,
//           oldImage: {
//             ...mockRecord.oldImage,
//             entityType: EntityType.TeamUserRelationship,
//           },
//         };

//         it("returns false", () => {
//           const result = userRemovedFromMeetingDynamoProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });

//       describe("when passed a record that isn't a meeting-conversation-user-relationship", () => {
//         const record = {
//           ...mockRecord,
//           oldImage: {
//             ...mockRecord.oldImage,
//             type: ConversationType.Group,
//           },
//         };

//         it("returns false", () => {
//           const result = userRemovedFromMeetingDynamoProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });

//       describe("when passed a record that isn't a removal", () => {
//         const record = {
//           ...mockRecord,
//           eventName: "MODIFY" as const,
//         };

//         it("returns false", () => {
//           const result = userRemovedFromMeetingDynamoProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });
//     });
//   });

//   describe("processRecord", () => {
//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         userMediatorService.getUsersByMeetingId.and.returnValue(Promise.resolve({ users: [ mockUserOne, mockUserTwo ] }));
//         userMediatorService.getUser.and.returnValue(Promise.resolve({ user: mockUserOne }));
//         meetingMediatorService.getMeeting.and.returnValue(Promise.resolve({ meeting: mockMeeting }));
//         userRemovedFromMeetingSnsService.sendMessage.and.returnValue(Promise.resolve());
//       });

//       it("calls userMediatorService.getUsersByMeetingId with the correct parameters", async () => {
//         await userRemovedFromMeetingDynamoProcessorService.processRecord(mockRecord);

//         expect(userMediatorService.getUsersByMeetingId).toHaveBeenCalledTimes(1);
//         expect(userMediatorService.getUsersByMeetingId).toHaveBeenCalledWith({ meetingId: mockMeetingId });
//       });

//       it("calls userMediatorService.getUser with the correct parameters", async () => {
//         await userRemovedFromMeetingDynamoProcessorService.processRecord(mockRecord);

//         expect(userMediatorService.getUser).toHaveBeenCalledTimes(1);
//         expect(userMediatorService.getUser).toHaveBeenCalledWith({ userId: mockUserIdOne });
//       });

//       it("calls meetingMediatorService.getMeeting with the correct parameters", async () => {
//         await userRemovedFromMeetingDynamoProcessorService.processRecord(mockRecord);

//         expect(meetingMediatorService.getMeeting).toHaveBeenCalledTimes(1);
//         expect(meetingMediatorService.getMeeting).toHaveBeenCalledWith({ meetingId: mockMeetingId });
//       });

//       it("calls userRemovedFromMeetingSnsService.sendMessage with the correct parameters", async () => {
//         await userRemovedFromMeetingDynamoProcessorService.processRecord(mockRecord);

//         expect(userRemovedFromMeetingSnsService.sendMessage).toHaveBeenCalledTimes(1);
//         expect(userRemovedFromMeetingSnsService.sendMessage).toHaveBeenCalledWith({ meeting: mockMeeting, user: mockUserOne, meetingMemberIds: [ mockUserIdOne, mockUserIdTwo ] });
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when userMediatorService.getUsersByMeetingId throws an error", () => {
//         beforeEach(() => {
//           userMediatorService.getUsersByMeetingId.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await userRemovedFromMeetingDynamoProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, userRemovedFromMeetingDynamoProcessorService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await userRemovedFromMeetingDynamoProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
