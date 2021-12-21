// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, SnsFactory, MessageTranscodedSnsMessage } from "@yac/util";
// import SNS from "aws-sdk/clients/sns";
// import { MessageTranscodedSnsService, MessageTranscodedSnsServiceInterface } from "../messageTranscoded.sns.service";

// interface MessageTranscodedSnsServiceWithAnyMethod extends MessageTranscodedSnsServiceInterface {
//   [key: string]: any;
// }

// describe("MessageTranscodedSnsService", () => {
//   let sns: Spied<SNS>;
//   const snsFactory: SnsFactory = () => sns as unknown as SNS;

//   let loggerService: Spied<LoggerService>;
//   let messageTranscodedSnsService: MessageTranscodedSnsServiceWithAnyMethod;

//   const mockMessageTranscodedSnsTopicArn = "mock-message-transcoded-sns-topic-arn";
//   const mockConfig = { snsTopicArns: { messageTranscoded: mockMessageTranscodedSnsTopicArn } };
//   const mockMessageId = "message-id" as MessageTranscodedSnsMessage["messageId"];
//   const mockKey = "mock-key";
//   const mockNewMimeType = "audio/mpeg" as MessageTranscodedSnsMessage["newMimeType"];

//   const mockError = new Error("test");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);

//     messageTranscodedSnsService = new MessageTranscodedSnsService(loggerService, snsFactory, mockConfig);
//   });

//   describe("sendMessage", () => {
//     const mockMessage = { messageId: mockMessageId, key: mockKey, newMimeType: mockNewMimeType };

//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         spyOn(messageTranscodedSnsService, "publish").and.returnValue(Promise.resolve());
//       });
//       it("calls this.publish with the correct params", async () => {
//         await messageTranscodedSnsService.sendMessage(mockMessage);

//         expect(messageTranscodedSnsService.publish).toHaveBeenCalledTimes(1);
//         expect(messageTranscodedSnsService.publish).toHaveBeenCalledWith(mockMessage);
//       });
//     });

//     describe("under error conditions", () => {
//       beforeEach(() => {
//         spyOn(messageTranscodedSnsService, "publish").and.throwError(mockError);
//       });

//       describe("when this.publish throws", () => {
//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await messageTranscodedSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in sendMessage", { error: mockError, message: mockMessage }, messageTranscodedSnsService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await messageTranscodedSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
