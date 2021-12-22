// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, User, Team, SnsFactory } from "@yac/util";
// import SNS from "aws-sdk/clients/sns";
// import { UserRemovedFromTeamSnsService, UserRemovedFromTeamSnsServiceInterface } from "../userRemovedFromTeam.sns.service";

// interface UserRemovedFromTeamSnsServiceWithAnyMethod extends UserRemovedFromTeamSnsServiceInterface {
//   [key: string]: any;
// }

// describe("UserRemovedFromTeamSnsService", () => {
//   let sns: Spied<SNS>;
//   const snsFactory: SnsFactory = () => sns as unknown as SNS;

//   let loggerService: Spied<LoggerService>;
//   let userRemovedFromTeamSnsService: UserRemovedFromTeamSnsServiceWithAnyMethod;

//   const mockUserRemovedFromTeamSnsTopicArn = "mock-user-added-to-team-sns-topic-arn";
//   const mockConfig = { snsTopicArns: { userRemovedFromTeam: mockUserRemovedFromTeamSnsTopicArn } };
//   const mockUserId = "user-mock-id";
//   const mockTeamId = "team-mock-id";

//   const mockUser: User = {
//     id: mockUserId,
//     image: "mock-image",
//   };

//   const mockTeam: Team = {
//     id: mockTeamId,
//     name: "mock-name",
//     image: "mock-image",
//     createdBy: "user_mock-id",
//     organizationId: "organization-123",
//   };

//   const mockError = new Error("test");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     userRemovedFromTeamSnsService = TestSupport.spyOnClass(UserRemovedFromTeamSnsService);

//     userRemovedFromTeamSnsService = new UserRemovedFromTeamSnsService(loggerService, snsFactory, mockConfig);
//   });

//   describe("sendMessage", () => {
//     const mockMessage = {
//       teamMemberIds: [],
//       team: mockTeam,
//       user: mockUser,
//     };

//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         spyOn(userRemovedFromTeamSnsService, "publish").and.returnValue(Promise.resolve());
//       });
//       it("calls this.publish with the correct params", async () => {
//         await userRemovedFromTeamSnsService.sendMessage(mockMessage);

//         expect(userRemovedFromTeamSnsService.publish).toHaveBeenCalledTimes(1);
//         expect(userRemovedFromTeamSnsService.publish).toHaveBeenCalledWith(mockMessage);
//       });
//     });

//     describe("under error conditions", () => {
//       beforeEach(() => {
//         spyOn(userRemovedFromTeamSnsService, "publish").and.throwError(mockError);
//       });

//       describe("when this.publish throws", () => {
//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await userRemovedFromTeamSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in sendMessage", { error: mockError, message: mockMessage }, userRemovedFromTeamSnsService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await userRemovedFromTeamSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
