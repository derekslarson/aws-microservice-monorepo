// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, User, SnsFactory } from "@yac/util";
// import SNS from "aws-sdk/clients/sns";
// import { UserRemovedAsFriendSnsService, UserRemovedAsFriendSnsServiceInterface } from "../userRemovedAsFriend.sns.service";

// interface UserRemovedAsFriendSnsServiceWithAnyMethod extends UserRemovedAsFriendSnsServiceInterface {
//   [key: string]: any;
// }

// describe("UserRemovedAsFriendSnsService", () => {
//   let sns: Spied<SNS>;
//   const snsFactory: SnsFactory = () => sns as unknown as SNS;

//   let loggerService: Spied<LoggerService>;
//   let userRemovedAsFriendSnsService: UserRemovedAsFriendSnsServiceWithAnyMethod;

//   const mockUserRemovedAsFriendSnsTopicArn = "mock-user-removed-as-friend-sns-topic-arn";
//   const mockConfig = { snsTopicArns: { userRemovedAsFriend: mockUserRemovedAsFriendSnsTopicArn } };
//   const mockUserIdOne = "user-mock-id-one";
//   const mockUserIdTwo = "user-mock-id-two";

//   const mockUserOne: User = {
//     id: mockUserIdOne,
//     image: "mock-image",
//   };

//   const mockUserTwo: User = {
//     id: mockUserIdTwo,
//     image: "mock-image",
//   };

//   const mockError = new Error("test");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     userRemovedAsFriendSnsService = TestSupport.spyOnClass(UserRemovedAsFriendSnsService);

//     userRemovedAsFriendSnsService = new UserRemovedAsFriendSnsService(loggerService, snsFactory, mockConfig);
//   });

//   describe("sendMessage", () => {
//     const mockMessage = {
//       userA: mockUserOne,
//       userB: mockUserTwo,
//     };

//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         spyOn(userRemovedAsFriendSnsService, "publish").and.returnValue(Promise.resolve());
//       });
//       it("calls this.publish with the correct params", async () => {
//         await userRemovedAsFriendSnsService.sendMessage(mockMessage);

//         expect(userRemovedAsFriendSnsService.publish).toHaveBeenCalledTimes(1);
//         expect(userRemovedAsFriendSnsService.publish).toHaveBeenCalledWith(mockMessage);
//       });
//     });

//     describe("under error conditions", () => {
//       beforeEach(() => {
//         spyOn(userRemovedAsFriendSnsService, "publish").and.throwError(mockError);
//       });

//       describe("when this.publish throws", () => {
//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await userRemovedAsFriendSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in sendMessage", { error: mockError, message: mockMessage }, userRemovedAsFriendSnsService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await userRemovedAsFriendSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
