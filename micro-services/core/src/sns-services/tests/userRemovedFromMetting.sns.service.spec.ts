// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, User, Meeting, SnsFactory } from "@yac/util";
// import SNS from "aws-sdk/clients/sns";
// import { UserRemovedFromMeetingSnsService, UserRemovedFromMeetingSnsServiceInterface } from "../userRemovedFromMeeting.sns.service";

// interface UserRemovedFromMeetingSnsServiceWithAnyMethod extends UserRemovedFromMeetingSnsServiceInterface {
//   [key: string]: any;
// }

// describe("UserRemovedFromMeetingSnsService", () => {
//   let sns: Spied<SNS>;
//   const snsFactory: SnsFactory = () => sns as unknown as SNS;

//   let loggerService: Spied<LoggerService>;
//   let userRemovedFromMeetingSnsService: UserRemovedFromMeetingSnsServiceWithAnyMethod;

//   const mockUserRemovedFromMeetingSnsTopicArn = "mock-user-removed-from-meeting-sns-topic-arn";
//   const mockConfig = { snsTopicArns: { userRemovedFromMeeting: mockUserRemovedFromMeetingSnsTopicArn } };
//   const mockUserId = "user-mock-id";
//   const mockMeetingId = "meeting_mock-id";

//   const mockUser: User = {
//     id: mockUserId,
//     image: "mock-image",
//   };

//   const mockMeeting: Meeting = {
//     id: mockMeetingId,
//     name: "mock-name",
//     image: "mock-image",
//     createdBy: "user-mock-id",
//     createdAt: new Date().toISOString(),
//     dueDate: new Date().toISOString(),
//   };

//   const mockError = new Error("test");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     userRemovedFromMeetingSnsService = TestSupport.spyOnClass(UserRemovedFromMeetingSnsService);

//     userRemovedFromMeetingSnsService = new UserRemovedFromMeetingSnsService(loggerService, snsFactory, mockConfig);
//   });

//   describe("sendMessage", () => {
//     const mockMessage = {
//       meetingMemberIds: [],
//       meeting: mockMeeting,
//       user: mockUser,
//     };

//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         spyOn(userRemovedFromMeetingSnsService, "publish").and.returnValue(Promise.resolve());
//       });
//       it("calls this.publish with the correct params", async () => {
//         await userRemovedFromMeetingSnsService.sendMessage(mockMessage);

//         expect(userRemovedFromMeetingSnsService.publish).toHaveBeenCalledTimes(1);
//         expect(userRemovedFromMeetingSnsService.publish).toHaveBeenCalledWith(mockMessage);
//       });
//     });

//     describe("under error conditions", () => {
//       beforeEach(() => {
//         spyOn(userRemovedFromMeetingSnsService, "publish").and.throwError(mockError);
//       });

//       describe("when this.publish throws", () => {
//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await userRemovedFromMeetingSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in sendMessage", { error: mockError, message: mockMessage }, userRemovedFromMeetingSnsService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await userRemovedFromMeetingSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
