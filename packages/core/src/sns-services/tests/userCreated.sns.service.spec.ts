// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, SnsFactory, UserId } from "@yac/util";
// import SNS from "aws-sdk/clients/sns";
// import { UserCreatedSnsService, UserCreatedSnsServiceInterface } from "../userCreated.sns.service";

// interface UserCreatedSnsServiceWithAnyMethod extends UserCreatedSnsServiceInterface {
//   [key: string]: any;
// }

// describe("UserCreatedSnsService", () => {
//   let sns: Spied<SNS>;
//   const snsFactory: SnsFactory = () => sns as unknown as SNS;

//   let loggerService: Spied<LoggerService>;
//   let userCreatedSnsService: UserCreatedSnsServiceWithAnyMethod;

//   const mockUserCreatedSnsTopicArn = "mock-user-created-sns-topic-arn";
//   const mockConfig = { snsTopicArns: { userCreated: mockUserCreatedSnsTopicArn } };
//   const mockUserId: UserId = "user-id";
//   const mockEmail = "mock-email";

//   const mockError = new Error("test");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);

//     userCreatedSnsService = new UserCreatedSnsService(loggerService, snsFactory, mockConfig);
//   });

//   describe("sendMessage", () => {
//     const mockMessage = { id: mockUserId, email: mockEmail };

//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         spyOn(userCreatedSnsService, "publish").and.returnValue(Promise.resolve());
//       });
//       it("calls this.publish with the correct params", async () => {
//         await userCreatedSnsService.sendMessage(mockMessage);

//         expect(userCreatedSnsService.publish).toHaveBeenCalledTimes(1);
//         expect(userCreatedSnsService.publish).toHaveBeenCalledWith(mockMessage);
//       });
//     });

//     describe("under error conditions", () => {
//       beforeEach(() => {
//         spyOn(userCreatedSnsService, "publish").and.throwError(mockError);
//       });

//       describe("when this.publish throws", () => {
//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await userCreatedSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in sendMessage", { error: mockError, message: mockMessage }, userCreatedSnsService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await userCreatedSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
