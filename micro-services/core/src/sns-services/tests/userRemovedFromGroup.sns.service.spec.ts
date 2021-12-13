// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, User, Group, SnsFactory } from "@yac/util";
// import SNS from "aws-sdk/clients/sns";
// import { UserRemovedFromGroupSnsService, UserRemovedFromGroupSnsServiceInterface } from "../userRemovedFromGroup.sns.service";

// interface UserRemovedFromGroupSnsServiceWithAnyMethod extends UserRemovedFromGroupSnsServiceInterface {
//   [key: string]: any;
// }

// describe("UserRemovedFromGroupSnsService", () => {
//   let sns: Spied<SNS>;
//   const snsFactory: SnsFactory = () => sns as unknown as SNS;

//   let loggerService: Spied<LoggerService>;
//   let userRemovedFromGroupSnsService: UserRemovedFromGroupSnsServiceWithAnyMethod;

//   const mockUserRemovedFromGroupSnsTopicArn = "mock-user-removed-from-group-sns-topic-arn";
//   const mockConfig = { snsTopicArns: { userRemovedFromGroup: mockUserRemovedFromGroupSnsTopicArn } };
//   const mockUserId = "user-mock-id";
//   const mockGroupId = "group_mock-id";

//   const mockUser: User = {
//     id: mockUserId,
//     image: "mock-image",
//   };

//   const mockGroup: Group = {
//     id: mockGroupId,
//     name: "mock-name",
//     image: "mock-image",
//     createdBy: "user-mock-id",
//     createdAt: new Date().toISOString(),
//   };

//   const mockError = new Error("test");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     userRemovedFromGroupSnsService = TestSupport.spyOnClass(UserRemovedFromGroupSnsService);

//     userRemovedFromGroupSnsService = new UserRemovedFromGroupSnsService(loggerService, snsFactory, mockConfig);
//   });

//   describe("sendMessage", () => {
//     const mockMessage = {
//       groupMemberIds: [],
//       group: mockGroup,
//       user: mockUser,
//     };

//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         spyOn(userRemovedFromGroupSnsService, "publish").and.returnValue(Promise.resolve());
//       });
//       it("calls this.publish with the correct params", async () => {
//         await userRemovedFromGroupSnsService.sendMessage(mockMessage);

//         expect(userRemovedFromGroupSnsService.publish).toHaveBeenCalledTimes(1);
//         expect(userRemovedFromGroupSnsService.publish).toHaveBeenCalledWith(mockMessage);
//       });
//     });

//     describe("under error conditions", () => {
//       beforeEach(() => {
//         spyOn(userRemovedFromGroupSnsService, "publish").and.throwError(mockError);
//       });

//       describe("when this.publish throws", () => {
//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await userRemovedFromGroupSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in sendMessage", { error: mockError, message: mockMessage }, userRemovedFromGroupSnsService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await userRemovedFromGroupSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
