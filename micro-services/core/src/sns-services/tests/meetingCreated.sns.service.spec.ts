// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, SnsFactory, User, Meeting } from "@yac/util";
// import SNS from "aws-sdk/clients/sns";
// import { MeetingCreatedSnsService, MeetingCreatedSnsServiceInterface } from "../meetingCreated.sns.service";

// interface MeetingCreatedSnsServiceWithAnyMethod extends MeetingCreatedSnsServiceInterface {
//   [key: string]: any;
// }

// describe("MeetingCreatedSnsService", () => {
//   let sns: Spied<SNS>;
//   const snsFactory: SnsFactory = () => sns as unknown as SNS;

//   let loggerService: Spied<LoggerService>;
//   let meetingCreatedSnsService: MeetingCreatedSnsServiceWithAnyMethod;

//   const mockMeetingCreatedSnsTopicArn = "mock-meeting-created-sns-topic-arn";
//   const mockConfig = { snsTopicArns: { meetingCreated: mockMeetingCreatedSnsTopicArn } };
//   const mockMeetingId = "convo-meeting-mock-id";
//   const mockUserId: User["id"] = "user-mock-id";
//   const mockDateA = new Date().toISOString();
//   const mockDateB = new Date().toISOString();

//   const mockMeeting: Meeting = {
//     id: mockMeetingId,
//     name: "mock-name",
//     image: "mock-image",
//     createdBy: mockUserId,
//     dueDate: mockDateB,
//     createdAt: mockDateA,
//   };

//   const mockError = new Error("test");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);

//     meetingCreatedSnsService = new MeetingCreatedSnsService(loggerService, snsFactory, mockConfig);
//   });

//   describe("sendMessage", () => {
//     const mockMessage = { meeting: mockMeeting, meetingMemberIds: [ mockUserId ] };

//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         spyOn(meetingCreatedSnsService, "publish").and.returnValue(Promise.resolve());
//       });
//       it("calls this.publish with the correct params", async () => {
//         await meetingCreatedSnsService.sendMessage(mockMessage);

//         expect(meetingCreatedSnsService.publish).toHaveBeenCalledTimes(1);
//         expect(meetingCreatedSnsService.publish).toHaveBeenCalledWith(mockMessage);
//       });
//     });

//     describe("under error conditions", () => {
//       beforeEach(() => {
//         spyOn(meetingCreatedSnsService, "publish").and.throwError(mockError);
//       });

//       describe("when this.publish throws", () => {
//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await meetingCreatedSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in sendMessage", { error: mockError, message: mockMessage }, meetingCreatedSnsService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await meetingCreatedSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
