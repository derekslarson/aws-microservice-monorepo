// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, DynamoProcessorServiceInterface, DynamoProcessorServiceRecord } from "@yac/util";
// import { ConversationService, ConversationServiceInterface } from "../../entity-services/conversation.service";
// import { ConversationType } from "../../enums/conversationType.enum";
// import { EntityType } from "../../enums/entityType.enum";
// import { ImageMimeType } from "../../enums/image.mimeType.enum";
// import { MeetingMediatorService, MeetingMediatorServiceInterface } from "../../mediator-services/meeting.mediator.service";
// import { Meeting } from "../../repositories/conversation.dynamo.repository";
// import { MeetingCreatedSnsService, MeetingCreatedSnsServiceInterface } from "../../sns-services/meetingCreated.sns.service";
// import { MeetingCreatedDynamoProcessorService } from "../meetingCreated.dynamo.processor.service";

// describe("MeetingCreatedDynamoProcessorService", () => {
//   let loggerService: Spied<LoggerService>;
//   let meetingMediatorService: Spied<MeetingMediatorServiceInterface>;
//   let conversationService: Spied<ConversationServiceInterface>;
//   let meetingCreatedSnsService: Spied<MeetingCreatedSnsServiceInterface>;
//   let meetingCreatedDynamoProcessorService: DynamoProcessorServiceInterface;

//   const mockCoreTableName = "mock-core-table-name";
//   const mockConfig = { tableNames: { core: mockCoreTableName } };
//   const mockMeetingId = "meeting_mock-id";
//   const mockUserId = "user-mock-id";
//   const mockDateA = new Date().toISOString();
//   const mockDateB = new Date().toISOString();

//   const mockMeeting: Meeting = {
//     id: mockMeetingId,
//     name: "mock-name",
//     createdBy: mockUserId,
//     type: ConversationType.Meeting,
//     dueDate: mockDateB,
//     createdAt: mockDateA,
//     imageMimeType: ImageMimeType.Png,
//   };

//   const mockRecord: DynamoProcessorServiceRecord = {
//     eventName: "INSERT",
//     tableName: mockCoreTableName,
//     oldImage: {},
//     newImage: {
//       entityType: EntityType.Meeting,
//       ...mockMeeting,
//     },
//   };

//   const mockError = new Error("test");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     meetingCreatedSnsService = TestSupport.spyOnClass(MeetingCreatedSnsService);
//     meetingMediatorService = TestSupport.spyOnClass(MeetingMediatorService);
//     conversationService = TestSupport.spyOnClass(ConversationService);

//     meetingCreatedDynamoProcessorService = new MeetingCreatedDynamoProcessorService(loggerService, meetingCreatedSnsService, meetingMediatorService, conversationService, mockConfig);
//   });

//   describe("determineRecordSupport", () => {
//     describe("under normal conditions", () => {
//       describe("when passed a record that fits all necessary conditions", () => {
//         it("returns true", () => {
//           const result = meetingCreatedDynamoProcessorService.determineRecordSupport(mockRecord);

//           expect(result).toBe(true);
//         });
//       });

//       describe("when passed a record that isn't in the core table", () => {
//         const record = {
//           ...mockRecord,
//           tableName: "test",
//         };

//         it("returns false", () => {
//           const result = meetingCreatedDynamoProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });

//       describe("when passed a record that isn't a meeting", () => {
//         const record = {
//           ...mockRecord,
//           newImage: {
//             ...mockRecord.newImage,
//             entityType: EntityType.User,
//           },
//         };

//         it("returns false", () => {
//           const result = meetingCreatedDynamoProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });

//       describe("when passed a record that isn't an insert", () => {
//         const record = {
//           ...mockRecord,
//           eventName: "MODIFY" as const,
//         };

//         it("returns false", () => {
//           const result = meetingCreatedDynamoProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });
//     });
//   });

//   describe("processRecord", () => {
//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         meetingMediatorService.getMeeting.and.returnValue(Promise.resolve({ meeting: mockMeeting }));
//         meetingCreatedSnsService.sendMessage.and.returnValue(Promise.resolve());
//       });

//       it("calls meetingMediatorService.getMeeting with the correct parameters", async () => {
//         await meetingCreatedDynamoProcessorService.processRecord(mockRecord);

//         expect(meetingMediatorService.getMeeting).toHaveBeenCalledTimes(1);
//         expect(meetingMediatorService.getMeeting).toHaveBeenCalledWith({ meetingId: mockMeetingId });
//       });

//       it("calls meetingCreatedSnsService.sendMessage with the correct parameters", async () => {
//         await meetingCreatedDynamoProcessorService.processRecord(mockRecord);

//         expect(meetingCreatedSnsService.sendMessage).toHaveBeenCalledTimes(1);
//         expect(meetingCreatedSnsService.sendMessage).toHaveBeenCalledWith({ meeting: mockMeeting, meetingMemberIds: [ mockMeeting.createdBy ] });
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when meetingMediatorService.getMeeting throws an error", () => {
//         beforeEach(() => {
//           meetingMediatorService.getMeeting.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await meetingCreatedDynamoProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, meetingCreatedDynamoProcessorService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await meetingCreatedDynamoProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
