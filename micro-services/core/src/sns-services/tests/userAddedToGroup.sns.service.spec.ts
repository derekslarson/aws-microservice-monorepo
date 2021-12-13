// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, User, Group, SnsFactory } from "@yac/util";
// import SNS from "aws-sdk/clients/sns";
// import { UserAddedToGroupSnsService, UserAddedToGroupSnsServiceInterface } from "../userAddedToGroup.sns.service";

// interface UserAddedToGroupSnsServiceWithAnyMethod extends UserAddedToGroupSnsServiceInterface {
//   [key: string]: any;
// }

// describe("UserAddedToGroupSnsService", () => {
//   let sns: Spied<SNS>;
//   const snsFactory: SnsFactory = () => sns as unknown as SNS;

//   let loggerService: Spied<LoggerService>;
//   let userAddedToGroupSnsService: UserAddedToGroupSnsServiceWithAnyMethod;

//   const mockUserAddedToGroupSnsTopicArn = "mock-user-added-to-group-sns-topic-arn";
//   const mockConfig = { snsTopicArns: { userAddedToGroup: mockUserAddedToGroupSnsTopicArn } };
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
//     userAddedToGroupSnsService = TestSupport.spyOnClass(UserAddedToGroupSnsService);

//     userAddedToGroupSnsService = new UserAddedToGroupSnsService(loggerService, snsFactory, mockConfig);
//   });

//   describe("sendMessage", () => {
//     const mockMessage = {
//       groupMemberIds: [],
//       group: mockGroup,
//       user: mockUser,
//     };

//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         spyOn(userAddedToGroupSnsService, "publish").and.returnValue(Promise.resolve());
//       });
//       it("calls this.publish with the correct params", async () => {
//         await userAddedToGroupSnsService.sendMessage(mockMessage);

//         expect(userAddedToGroupSnsService.publish).toHaveBeenCalledTimes(1);
//         expect(userAddedToGroupSnsService.publish).toHaveBeenCalledWith(mockMessage);
//       });
//     });

//     describe("under error conditions", () => {
//       beforeEach(() => {
//         spyOn(userAddedToGroupSnsService, "publish").and.throwError(mockError);
//       });

//       describe("when this.publish throws", () => {
//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await userAddedToGroupSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in sendMessage", { error: mockError, message: mockMessage }, userAddedToGroupSnsService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await userAddedToGroupSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
