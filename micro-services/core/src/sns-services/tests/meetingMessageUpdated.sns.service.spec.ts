// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, SnsFactory, Message, User, Meeting } from "@yac/util";
// import SNS from "aws-sdk/clients/sns";
// import { ConversationType } from "../../enums/conversationType.enum";
// import { MessageMimeType } from "../../enums/message.mimeType.enum";
// import { UserId } from "../../types/userId.type";
// import { MeetingMessageUpdatedSnsService, MeetingMessageUpdatedSnsServiceInterface } from "../meetingMessageUpdated.sns.service";

// interface MeetingMessageUpdatedSnsServiceWithAnyMethod extends MeetingMessageUpdatedSnsServiceInterface {
//   [key: string]: any;
// }

// describe("MeetingMessageUpdatedSnsService", () => {
//   let sns: Spied<SNS>;
//   const snsFactory: SnsFactory = () => sns as unknown as SNS;

//   let loggerService: Spied<LoggerService>;
//   let meetingMessageUpdatedSnsService: MeetingMessageUpdatedSnsServiceWithAnyMethod;

//   const mockMeetingMessageUpdatedSnsTopicArn = "mock-meeting-message-updated-sns-topic-arn";
//   const mockConfig = { snsTopicArns: { meetingMessageUpdated: mockMeetingMessageUpdatedSnsTopicArn } };
//   const mockMessageId = "message-id";
//   const mockUserIdOne: UserId = "user-mock-id-one";
//   const mockUserIdTwo: UserId = "user-mock-id-two";

//   const mockUser: User = {
//     id: mockUserIdOne,
//     image: "mock-image",
//   };

//   const mockMeeting: Meeting = {
//     id: "convo-meeting-mock-id",
//     name: "mock-name",
//     image: "mock-image",
//     createdBy: "user-mock-id",
//     createdAt: new Date().toISOString(),
//     dueDate: new Date().toISOString(),
//   };

//   const mockMeetingMessage: Message = {
//     id: mockMessageId,
//     to: mockMeeting,
//     from: mockUser,
//     type: ConversationType.Meeting,
//     createdAt: new Date().toISOString(),
//     seenAt: { [mockUserIdOne]: new Date().toISOString() },
//     reactions: {},
//     replyCount: 0,
//     mimeType: MessageMimeType.AudioMp3,
//     fetchUrl: "mock-fetch-url",
//     title: "mock-title",
//   };

//   const mockError = new Error("test");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);

//     meetingMessageUpdatedSnsService = new MeetingMessageUpdatedSnsService(loggerService, snsFactory, mockConfig);
//   });

//   describe("sendMessage", () => {
//     const mockMessage = { message: mockMeetingMessage, meetingMemberIds: [ mockUserIdOne, mockUserIdTwo ] };

//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         spyOn(meetingMessageUpdatedSnsService, "publish").and.returnValue(Promise.resolve());
//       });
//       it("calls this.publish with the correct params", async () => {
//         await meetingMessageUpdatedSnsService.sendMessage(mockMessage);

//         expect(meetingMessageUpdatedSnsService.publish).toHaveBeenCalledTimes(1);
//         expect(meetingMessageUpdatedSnsService.publish).toHaveBeenCalledWith(mockMessage);
//       });
//     });

//     describe("under error conditions", () => {
//       beforeEach(() => {
//         spyOn(meetingMessageUpdatedSnsService, "publish").and.throwError(mockError);
//       });

//       describe("when this.publish throws", () => {
//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await meetingMessageUpdatedSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in sendMessage", { error: mockError, message: mockMessage }, meetingMessageUpdatedSnsService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await meetingMessageUpdatedSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
