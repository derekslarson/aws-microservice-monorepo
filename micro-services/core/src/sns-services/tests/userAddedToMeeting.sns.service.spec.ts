// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, User, Meeting, SnsFactory } from "@yac/util";
// import SNS from "aws-sdk/clients/sns";
// import { UserAddedToMeetingSnsService, UserAddedToMeetingSnsServiceInterface } from "../userAddedToMeeting.sns.service";

// interface UserAddedToMeetingSnsServiceWithAnyMethod extends UserAddedToMeetingSnsServiceInterface {
//   [key: string]: any;
// }

// describe("UserAddedToMeetingSnsService", () => {
//   let sns: Spied<SNS>;
//   const snsFactory: SnsFactory = () => sns as unknown as SNS;

//   let loggerService: Spied<LoggerService>;
//   let userAddedToMeetingSnsService: UserAddedToMeetingSnsServiceWithAnyMethod;

//   const mockUserAddedToMeetingSnsTopicArn = "mock-user-added-to-meeting-sns-topic-arn";
//   const mockConfig = { snsTopicArns: { userAddedToMeeting: mockUserAddedToMeetingSnsTopicArn } };
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
//     userAddedToMeetingSnsService = TestSupport.spyOnClass(UserAddedToMeetingSnsService);

//     userAddedToMeetingSnsService = new UserAddedToMeetingSnsService(loggerService, snsFactory, mockConfig);
//   });

//   describe("sendMessage", () => {
//     const mockMessage = {
//       meetingMemberIds: [],
//       meeting: mockMeeting,
//       user: mockUser,
//     };

//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         spyOn(userAddedToMeetingSnsService, "publish").and.returnValue(Promise.resolve());
//       });
//       it("calls this.publish with the correct params", async () => {
//         await userAddedToMeetingSnsService.sendMessage(mockMessage);

//         expect(userAddedToMeetingSnsService.publish).toHaveBeenCalledTimes(1);
//         expect(userAddedToMeetingSnsService.publish).toHaveBeenCalledWith(mockMessage);
//       });
//     });

//     describe("under error conditions", () => {
//       beforeEach(() => {
//         spyOn(userAddedToMeetingSnsService, "publish").and.throwError(mockError);
//       });

//       describe("when this.publish throws", () => {
//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await userAddedToMeetingSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in sendMessage", { error: mockError, message: mockMessage }, userAddedToMeetingSnsService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await userAddedToMeetingSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
