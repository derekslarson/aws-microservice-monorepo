// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, User, SnsFactory } from "@yac/util";
// import SNS from "aws-sdk/clients/sns";
// import { UserAddedAsFriendSnsService, UserAddedAsFriendSnsServiceInterface } from "../userAddedAsFriend.sns.service";

// interface UserAddedAsFriendSnsServiceWithAnyMethod extends UserAddedAsFriendSnsServiceInterface {
//   [key: string]: any;
// }

// describe("UserAddedAsFriendSnsService", () => {
//   let sns: Spied<SNS>;
//   const snsFactory: SnsFactory = () => sns as unknown as SNS;

//   let loggerService: Spied<LoggerService>;
//   let userAddedAsFriendSnsService: UserAddedAsFriendSnsServiceWithAnyMethod;

//   const mockUserAddedAsFriendSnsTopicArn = "mock-user-added-as-friend-sns-topic-arn";
//   const mockConfig = { snsTopicArns: { userAddedAsFriend: mockUserAddedAsFriendSnsTopicArn } };
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
//     userAddedAsFriendSnsService = TestSupport.spyOnClass(UserAddedAsFriendSnsService);

//     userAddedAsFriendSnsService = new UserAddedAsFriendSnsService(loggerService, snsFactory, mockConfig);
//   });

//   describe("sendMessage", () => {
//     const mockMessage = {
//       addingUser: mockUserOne,
//       addedUser: mockUserTwo,
//     };

//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         spyOn(userAddedAsFriendSnsService, "publish").and.returnValue(Promise.resolve());
//       });
//       it("calls this.publish with the correct params", async () => {
//         await userAddedAsFriendSnsService.sendMessage(mockMessage);

//         expect(userAddedAsFriendSnsService.publish).toHaveBeenCalledTimes(1);
//         expect(userAddedAsFriendSnsService.publish).toHaveBeenCalledWith(mockMessage);
//       });
//     });

//     describe("under error conditions", () => {
//       beforeEach(() => {
//         spyOn(userAddedAsFriendSnsService, "publish").and.throwError(mockError);
//       });

//       describe("when this.publish throws", () => {
//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await userAddedAsFriendSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in sendMessage", { error: mockError, message: mockMessage }, userAddedAsFriendSnsService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await userAddedAsFriendSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
