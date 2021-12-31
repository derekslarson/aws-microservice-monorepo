// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, S3ProcessorServiceInterface, S3ProcessorServiceRecord } from "@yac/util";
// import { TranscodingService, TranscodingServiceInterface } from "../../services/transcoding.service";
// import { RawMessageFileCreatedS3ProcessorService } from "../rawMessageFileCreated.s3.processor.service";

// describe("RawMessageFileCreatedS3ProcessorService", () => {
//   let loggerService: Spied<LoggerService>;
//   let transcodingService: Spied<TranscodingServiceInterface>;
//   let rawMessageFileCreatedS3ProcessorService: S3ProcessorServiceInterface;

//   const mockAudoAiApiKey = "mock-audo-ai-api-key";
//   const mockAudoAiApiDomain = "mock-audo-ai-api-domain";
//   const mockRawMessageBucketName = "mock-raw-message-bucket-name";
//   const mockKey = "mock-key";

//   const mockConfig = {
//     audoAiApiKey: mockAudoAiApiKey,
//     audoAiApiDomain: mockAudoAiApiDomain,
//     bucketNames: { rawMessage: mockRawMessageBucketName },
//   };

//   const mockRecord: S3ProcessorServiceRecord = {
//     bucketName: mockRawMessageBucketName,
//     key: mockKey,
//   };

//   const mockError = new Error("test");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     transcodingService = TestSupport.spyOnClass(TranscodingService);

//     rawMessageFileCreatedS3ProcessorService = new RawMessageFileCreatedS3ProcessorService(loggerService, transcodingService, mockConfig);
//   });

//   describe("determineRecordSupport", () => {
//     describe("under normal conditions", () => {
//       describe("when passed a record that fits all necessary conditions", () => {
//         it("returns true", () => {
//           const result = rawMessageFileCreatedS3ProcessorService.determineRecordSupport(mockRecord);

//           expect(result).toBe(true);
//         });
//       });

//       describe("when passed a record that isn't in the raw message bucket", () => {
//         const record = {
//           ...mockRecord,
//           bucketName: "test",
//         };

//         it("returns false", () => {
//           const result = rawMessageFileCreatedS3ProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });
//     });
//   });

//   describe("processRecord", () => {
//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         transcodingService.startTranscodingJob.and.returnValue(Promise.resolve());
//       });

//       it("calls transcodingService.startTranscodingJob with the correct parameters", async () => {
//         await rawMessageFileCreatedS3ProcessorService.processRecord(mockRecord);

//         expect(transcodingService.startTranscodingJob).toHaveBeenCalledTimes(1);
//         expect(transcodingService.startTranscodingJob).toHaveBeenCalledWith({ key: mockKey });
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when transcodingService.startTranscodingJob throws an error", () => {
//         beforeEach(() => {
//           transcodingService.startTranscodingJob.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await rawMessageFileCreatedS3ProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, rawMessageFileCreatedS3ProcessorService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await rawMessageFileCreatedS3ProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
