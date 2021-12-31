// /* eslint-disable @typescript-eslint/unbound-method */
// import {
//   MessageFileRepositoryInterface,
//   EnhancedMessageS3Repository,
//   HttpRequestService,
//   HttpRequestServiceInterface,
//   LoggerService,
//   LoggerServiceInterface,
//   MessageMimeType,
//   RawMessageS3Repository,
//   Spied,
//   TestSupport,
//   FileOperation,
// } from "@yac/util";
// import { MessageTranscodedSnsService, MessageTranscodedSnsServiceInterface } from "../../sns-services/messageTranscoded.sns.service";
// import { TranscodingService, TranscodingServiceInterface } from "../transcoding.service";

// describe("TranscodingService", () => {
//   let loggerService: Spied<LoggerServiceInterface>;
//   let httpRequestService: Spied<HttpRequestServiceInterface>;
//   let messageTranscodedSnsService: Spied<MessageTranscodedSnsServiceInterface>;
//   let rawMessageFileRepository: Spied<MessageFileRepositoryInterface>;
//   let enhancedMessageFileRepository: Spied<MessageFileRepositoryInterface>;
//   let transcodingService: TranscodingServiceInterface;

//   const mockAudoAiApiKey = "mock-audo-ai-api-key";
//   const mockAudoAiApiDomain = "mock-audo-ai-api-domain";
//   const mockConversationId = "mock-conversation-id";
//   const mockMessageId = "mock-message-id";
//   const mockKeyWithoutExtension = `${mockConversationId}/${mockMessageId}`;
//   const mockKey = `${mockKeyWithoutExtension}.test`;
//   const mockInputUrl = "mock-input-url";
//   const mockOutputUrl = "mock-output-url";
//   const mockRawVideoContentType = MessageMimeType.VideoWebm;
//   const mockRawAudioContentType = MessageMimeType.AudioMp4;
//   const mockEnhancedAudioContentType = MessageMimeType.AudioMp3;
//   const mockEnhancedVideoContentType = MessageMimeType.VideoMp4;

//   const mockConfig = {
//     audoAiApiKey: mockAudoAiApiKey,
//     audoAiApiDomain: mockAudoAiApiDomain,
//   };

//   const mockError = new Error("test");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     httpRequestService = TestSupport.spyOnClass(HttpRequestService);
//     messageTranscodedSnsService = TestSupport.spyOnClass(MessageTranscodedSnsService);
//     rawMessageFileRepository = TestSupport.spyOnClass(RawMessageS3Repository);
//     enhancedMessageFileRepository = TestSupport.spyOnClass(EnhancedMessageS3Repository);

//     transcodingService = new TranscodingService(loggerService, httpRequestService, messageTranscodedSnsService, rawMessageFileRepository, enhancedMessageFileRepository, mockConfig);
//   });

//   describe("startTranscodingJob", () => {
//     const params = { key: mockKey };

//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         rawMessageFileRepository.headObject.and.returnValue(Promise.resolve({}));
//         rawMessageFileRepository.getSignedUrl.and.returnValue({ signedUrl: mockInputUrl });
//         enhancedMessageFileRepository.getSignedUrl.and.returnValue({ signedUrl: mockOutputUrl });
//         httpRequestService.post.and.returnValue(Promise.resolve());
//       });

//       it("calls rawMessageFileRepository.headObject with the correct params", async () => {
//         await transcodingService.startTranscodingJob(params);

//         expect(rawMessageFileRepository.headObject).toHaveBeenCalledTimes(1);
//         expect(rawMessageFileRepository.headObject).toHaveBeenCalledWith({ key: mockKey });
//       });

//       describe("when rawMessageFileRepository.headObject returns a video content type", () => {
//         beforeEach(() => {
//           rawMessageFileRepository.headObject.and.returnValue(Promise.resolve({ ContentType: mockRawVideoContentType }));
//         });

//         it("calls rawMessageFileRepository.getSignedUrl with the correct params", async () => {
//           await transcodingService.startTranscodingJob(params);

//           expect(rawMessageFileRepository.getSignedUrl).toHaveBeenCalledTimes(1);
//           expect(rawMessageFileRepository.getSignedUrl).toHaveBeenCalledWith({ operation: FileOperation.Get, key: mockKey });
//         });

//         it("calls enhancedMessageFileRepository.getSignedUrl with the correct params", async () => {
//           await transcodingService.startTranscodingJob(params);

//           expect(enhancedMessageFileRepository.getSignedUrl).toHaveBeenCalledTimes(1);
//           expect(enhancedMessageFileRepository.getSignedUrl).toHaveBeenCalledWith({
//             operation: FileOperation.Upload,
//             key: `${mockKeyWithoutExtension}.mp4`,
//             mimeType: mockEnhancedVideoContentType,
//           });
//         });

//         it("calls httpRequestService.post with the correct params", async () => {
//           await transcodingService.startTranscodingJob(params);

//           expect(httpRequestService.post).toHaveBeenCalledTimes(1);
//           expect(httpRequestService.post).toHaveBeenCalledWith(
//             `${mockAudoAiApiDomain}/v1/remove-noise`,
//             { input: mockInputUrl, output: mockOutputUrl, outputExtension: "mp4" },
//             {},
//             { "x-api-key": mockAudoAiApiKey },
//           );
//         });
//       });

//       describe("when rawMessageFileRepository.headObject returns an audio content type", () => {
//         beforeEach(() => {
//           rawMessageFileRepository.headObject.and.returnValue(Promise.resolve({ ContentType: mockRawAudioContentType }));
//         });

//         it("calls rawMessageFileRepository.getSignedUrl with the correct params", async () => {
//           await transcodingService.startTranscodingJob(params);

//           expect(rawMessageFileRepository.getSignedUrl).toHaveBeenCalledTimes(1);
//           expect(rawMessageFileRepository.getSignedUrl).toHaveBeenCalledWith({ operation: FileOperation.Get, key: mockKey });
//         });

//         it("calls enhancedMessageFileRepository.getSignedUrl with the correct params", async () => {
//           await transcodingService.startTranscodingJob(params);

//           expect(enhancedMessageFileRepository.getSignedUrl).toHaveBeenCalledTimes(1);
//           expect(enhancedMessageFileRepository.getSignedUrl).toHaveBeenCalledWith({
//             operation: FileOperation.Upload,
//             key: `${mockKeyWithoutExtension}.mp3`,
//             mimeType: mockEnhancedAudioContentType,
//           });
//         });

//         it("calls httpRequestService.post with the correct params", async () => {
//           await transcodingService.startTranscodingJob(params);

//           expect(httpRequestService.post).toHaveBeenCalledTimes(1);
//           expect(httpRequestService.post).toHaveBeenCalledWith(
//             `${mockAudoAiApiDomain}/v1/remove-noise`,
//             { input: mockInputUrl, output: mockOutputUrl, outputExtension: "mp3" },
//             {},
//             { "x-api-key": mockAudoAiApiKey },
//           );
//         });
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when httpRequestService.post throws an error", () => {
//         beforeEach(() => {
//           rawMessageFileRepository.headObject.and.returnValue(Promise.resolve({}));
//           rawMessageFileRepository.getSignedUrl.and.returnValue({ signedUrl: mockInputUrl });
//           enhancedMessageFileRepository.getSignedUrl.and.returnValue({ signedUrl: mockOutputUrl });
//           httpRequestService.post.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await transcodingService.startTranscodingJob(params);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in startTranscodingJob", { error: mockError, params }, transcodingService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await transcodingService.startTranscodingJob(params);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });

//   describe("transcodingJobComplete", () => {
//     const params = { key: mockKey };

//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         enhancedMessageFileRepository.headObject.and.returnValue(Promise.resolve({}));
//         messageTranscodedSnsService.sendMessage.and.returnValue(Promise.resolve());
//       });

//       it("calls enhancedMessageFileRepository.headObject with the correct params", async () => {
//         await transcodingService.transcodingJobComplete(params);

//         expect(enhancedMessageFileRepository.headObject).toHaveBeenCalledTimes(1);
//         expect(enhancedMessageFileRepository.headObject).toHaveBeenCalledWith({ key: mockKey });
//       });

//       describe("when enhancedMessageFileRepository.headObject returns a video content type", () => {
//         beforeEach(() => {
//           enhancedMessageFileRepository.headObject.and.returnValue(Promise.resolve({ ContentType: mockEnhancedVideoContentType }));
//         });

//         it("calls messageTranscodedSnsService.sendMessage with the correct params", async () => {
//           await transcodingService.transcodingJobComplete(params);

//           expect(messageTranscodedSnsService.sendMessage).toHaveBeenCalledTimes(1);
//           expect(messageTranscodedSnsService.sendMessage).toHaveBeenCalledWith({
//             key: mockKey,
//             messageId: mockMessageId,
//             newMimeType: mockEnhancedVideoContentType,
//           });
//         });
//       });

//       describe("when enhancedMessageFileRepository.headObject returns an audio content type", () => {
//         beforeEach(() => {
//           enhancedMessageFileRepository.headObject.and.returnValue(Promise.resolve({ ContentType: mockEnhancedAudioContentType }));
//         });

//         it("calls messageTranscodedSnsService.sendMessage with the correct params", async () => {
//           await transcodingService.transcodingJobComplete(params);

//           expect(messageTranscodedSnsService.sendMessage).toHaveBeenCalledTimes(1);
//           expect(messageTranscodedSnsService.sendMessage).toHaveBeenCalledWith({
//             key: mockKey,
//             messageId: mockMessageId,
//             newMimeType: mockEnhancedAudioContentType,
//           });
//         });
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when messageTranscodedSnsService.sendMessage throws an error", () => {
//         beforeEach(() => {
//           enhancedMessageFileRepository.headObject.and.returnValue(Promise.resolve({}));
//           messageTranscodedSnsService.sendMessage.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await transcodingService.transcodingJobComplete(params);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in transcodingJobComplete", { error: mockError, params }, transcodingService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await transcodingService.transcodingJobComplete(params);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
