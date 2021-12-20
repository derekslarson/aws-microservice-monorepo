// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, SnsProcessorServiceInterface, Team } from "@yac/util";
// import { WebSocketEvent } from "../../enums/webSocket.event.enum";
// import { WebSocketMediatorService, WebSocketMediatorServiceInterface } from "../../mediator-services/webSocket.mediator.service";
// import { TeamCreatedSnsProcessorService } from "../teamCreated.sns.processor.service";

// describe("TeamCreatedSnsProcessorService", () => {
//   let loggerService: Spied<LoggerService>;
//   let webSocketMediatorService: Spied<WebSocketMediatorServiceInterface>;
//   let teamCreatedSnsProcessorService: SnsProcessorServiceInterface;

//   const teamCreatedSnsTopicArn = "mock-team-created-sns-topic-arn";
//   const mockConfig = { snsTopicArns: { teamCreated: teamCreatedSnsTopicArn } };
//   const mockUserOneId = "user-one-mock-id";
//   const mockUserTwoId = "user-two-mock-id";
//   const mockTeamMemberIds = [ mockUserOneId, mockUserTwoId ];

//   const mockTeam: Team = {
//     id: "team-mock-id",
//     name: "mock-name",
//     image: "mock-image",
//     createdBy: mockUserOneId,
//   };

//   const mockRecord = {
//     topicArn: teamCreatedSnsTopicArn,
//     message: {
//       team: mockTeam,
//       teamMemberIds: mockTeamMemberIds,
//     },
//   };
//   const mockError = new Error("test");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     webSocketMediatorService = TestSupport.spyOnClass(WebSocketMediatorService);

//     teamCreatedSnsProcessorService = new TeamCreatedSnsProcessorService(loggerService, webSocketMediatorService, mockConfig);
//   });

//   describe("determineRecordSupport", () => {
//     describe("under normal conditions", () => {
//       describe("when passed a record with a topic arn matching snsTopicArns.teamCreated in the config", () => {
//         it("returns true", () => {
//           const result = teamCreatedSnsProcessorService.determineRecordSupport(mockRecord);

//           expect(result).toBe(true);
//         });
//       });

//       describe("when passed a record with a topic arn not matching snsTopicArns.teamCreated in the config", () => {
//         const record = {
//           ...mockRecord,
//           topicArn: "test",
//         };

//         it("returns false", () => {
//           const result = teamCreatedSnsProcessorService.determineRecordSupport(record);

//           expect(result).toBe(false);
//         });
//       });
//     });
//   });

//   describe("processRecord", () => {
//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         webSocketMediatorService.sendMessage.and.returnValue(Promise.resolve());
//       });

//       it("calls webSocketMediatorService.sendMessage with the correct parameters", async () => {
//         await teamCreatedSnsProcessorService.processRecord(mockRecord);

//         expect(webSocketMediatorService.sendMessage).toHaveBeenCalledTimes(2);
//         expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserOneId, event: WebSocketEvent.TeamCreated, data: { team: mockTeam } });
//         expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserTwoId, event: WebSocketEvent.TeamCreated, data: { team: mockTeam } });
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when webSocketMediatorService.sendMessage throws an error", () => {
//         beforeEach(() => {
//           webSocketMediatorService.sendMessage.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await teamCreatedSnsProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, teamCreatedSnsProcessorService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await teamCreatedSnsProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
