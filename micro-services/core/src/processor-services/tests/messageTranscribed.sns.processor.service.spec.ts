// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, SnsProcessorServiceInterface } from "@yac/util";
// import { MessageMediatorService, MessageMediatorServiceInterface } from "../../mediator-services/message.mediator.service";
// import { KeyPrefix } from "../../enums/keyPrefix.enum";
// import { MessageTranscribedSnsProcessorService } from "../messageTranscribed.sns.processor.service";

// describe("MessageTranscribedSnsProcessorService", () => {
//   let loggerService: Spied<LoggerService>;
//   let messageMediatorService: Spied<MessageMediatorServiceInterface>;
//   let messageTranscribedSnsProcessorService: SnsProcessorServiceInterface;

//   const mockMessageTranscribedSnsTopicArn = "mock-message-transcoded-sns-topic-arn";
//   const mockConfig = { snsTopicArns: { messageTranscribed: mockMessageTranscribedSnsTopicArn } };
//   const mockMessageId = `${KeyPrefix.Message}mock-id`;
//   const mockPendingMessageId = mockMessageId.replace(KeyPrefix.Message, KeyPrefix.PendingMessage);
//   const mockTranscript = "mock-transcript";

//   const mockRecord = {
//     topicArn: mockMessageTranscribedSnsTopicArn,
//     message: {
//       messageId: mockMessageId,
//       transcript: mockTranscript,
//     },
//   };
//   const mockError = new Error("test");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     messageMediatorService = TestSupport.spyOnClass(MessageMediatorService);

//     messageTranscribedSnsProcessorService = new MessageTranscribedSnsProcessorService(loggerService, messageMediatorService, mockConfig);
//   });

//   describe("determineRecordSupport", () => {
//     describe("under normal conditions", () => {
//       describe("when passed a record with a topic arn matching snsTopicArns.messageTranscribed in the config", () => {
//         it("returns true", () => {
//           const result = messageTranscribedSnsProcessorService.determineRecordSupport(mockRecord);

//           expect(result).toBe(true);
//         });
//       });

//       describe("when passed a record with a topic arn not matching snsTopicArns.messageTranscribed in the config", () => {
//         const record = {
//           ...mockRecord,
//           topicArn: "test",
//         };

//         it("returns false", () => {
//           const result = messageTranscribedSnsProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });
//     });
//   });

//   describe("processRecord", () => {
//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         messageMediatorService.convertPendingToRegularMessage.and.returnValue(Promise.resolve());
//       });

//       it("calls messageMediatorService.convertPendingToRegularMessage with the correct parameters", async () => {
//         await messageTranscribedSnsProcessorService.processRecord(mockRecord);

//         expect(messageMediatorService.convertPendingToRegularMessage).toHaveBeenCalledTimes(1);
//         expect(messageMediatorService.convertPendingToRegularMessage).toHaveBeenCalledWith({
//           pendingMessageId: mockPendingMessageId,
//           transcript: mockTranscript,
//         });
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when messageMediatorService.convertPendingToRegularMessage throws an error", () => {
//         beforeEach(() => {
//           messageMediatorService.convertPendingToRegularMessage.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await messageTranscribedSnsProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, messageTranscribedSnsProcessorService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await messageTranscribedSnsProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
