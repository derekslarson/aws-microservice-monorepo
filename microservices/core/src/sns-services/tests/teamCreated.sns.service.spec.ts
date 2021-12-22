// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, SnsFactory, Team, User } from "@yac/util";
// import SNS from "aws-sdk/clients/sns";
// import { TeamCreatedSnsService, TeamCreatedSnsServiceInterface } from "../teamCreated.sns.service";

// interface TeamCreatedSnsServiceWithAnyMethod extends TeamCreatedSnsServiceInterface {
//   [key: string]: any;
// }

// describe("TeamCreatedSnsService", () => {
//   let sns: Spied<SNS>;
//   const snsFactory: SnsFactory = () => sns as unknown as SNS;

//   let loggerService: Spied<LoggerService>;
//   let teamCreatedSnsService: TeamCreatedSnsServiceWithAnyMethod;

//   const mockTeamCreatedSnsTopicArn = "mock-team-created-sns-topic-arn";
//   const mockConfig = { snsTopicArns: { teamCreated: mockTeamCreatedSnsTopicArn } };
//   const mockTeamId = "team-id";
//   const mockUserA: User["id"] = "user-mock-id";

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

//     teamCreatedSnsService = new TeamCreatedSnsService(loggerService, snsFactory, mockConfig);
//   });

//   describe("sendMessage", () => {
//     const mockMessage = { team: mockTeam, teamMemberIds: [ mockUserA ] };

//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         spyOn(teamCreatedSnsService, "publish").and.returnValue(Promise.resolve());
//       });
//       it("calls this.publish with the correct params", async () => {
//         await teamCreatedSnsService.sendMessage(mockMessage);

//         expect(teamCreatedSnsService.publish).toHaveBeenCalledTimes(1);
//         expect(teamCreatedSnsService.publish).toHaveBeenCalledWith(mockMessage);
//       });
//     });

//     describe("under error conditions", () => {
//       beforeEach(() => {
//         spyOn(teamCreatedSnsService, "publish").and.throwError(mockError);
//       });

//       describe("when this.publish throws", () => {
//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await teamCreatedSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in sendMessage", { error: mockError, message: mockMessage }, teamCreatedSnsService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await teamCreatedSnsService.sendMessage(mockMessage);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
