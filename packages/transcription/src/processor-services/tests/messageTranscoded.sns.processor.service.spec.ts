// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, SnsProcessorServiceInterface } from "@yac/util";
// import { TranscriptionService, TranscriptionServiceInterface } from "../../services/transcription.service";
// import { MessageTranscodedSnsProcessorService } from "../messageTranscoded.sns.processor.service";

// describe("MessageTranscodedSnsProcessorService", () => {
//   let loggerService: Spied<LoggerService>;
//   let transcriptionService: Spied<TranscriptionServiceInterface>;
//   let messageTranscodedSnsProcessorService: SnsProcessorServiceInterface;

//   const mockMessageTranscodedSnsTopicArn = "mock-message-transcoded-sns-topic-arn";
//   const mockConfig = { snsTopicArns: { messageTranscoded: mockMessageTranscodedSnsTopicArn } };
//   const mockMessageId = "mock-message-id";
//   const mockKey = "mock-key";

//   const mockRecord = {
//     topicArn: mockMessageTranscodedSnsTopicArn,
//     message: {
//       messageId: mockMessageId,
//       key: mockKey,
//     },
//   };
//   const mockError = new Error("test");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     transcriptionService = TestSupport.spyOnClass(TranscriptionService);

//     messageTranscodedSnsProcessorService = new MessageTranscodedSnsProcessorService(loggerService, transcriptionService, mockConfig);
//   });

//   describe("determineRecordSupport", () => {
//     describe("under normal conditions", () => {
//       describe("when passed a record with a topic arn matching snsTopicArns.messageTranscoded in the config", () => {
//         it("returns true", () => {
//           const result = messageTranscodedSnsProcessorService.determineRecordSupport(mockRecord);

//           expect(result).toBe(true);
//         });
//       });

//       describe("when passed a record with a topic arn not matching snsTopicArns.messageTranscoded in the config", () => {
//         const record = {
//           ...mockRecord,
//           topicArn: "test",
//         };

//         it("returns false", () => {
//           const result = messageTranscodedSnsProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });
//     });
//   });

//   describe("processRecord", () => {
//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         transcriptionService.startTranscriptionJob.and.returnValue(Promise.resolve());
//       });

//       it("calls transcriptionService.startTranscriptionJob with the correct parameters", async () => {
//         await messageTranscodedSnsProcessorService.processRecord(mockRecord);

//         expect(transcriptionService.startTranscriptionJob).toHaveBeenCalledTimes(1);
//         expect(transcriptionService.startTranscriptionJob).toHaveBeenCalledWith({ messageFileKey: mockKey, messageId: mockMessageId });
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when transcriptionService.startTranscriptionJob throws an error", () => {
//         beforeEach(() => {
//           transcriptionService.startTranscriptionJob.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await messageTranscodedSnsProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, messageTranscodedSnsProcessorService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await messageTranscodedSnsProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
