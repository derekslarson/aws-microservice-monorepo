// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, SnsProcessorServiceInterface, User, Team } from "@yac/util";
// import { WebSocketEvent } from "../../enums/webSocket.event.enum";
// import { WebSocketMediatorService, WebSocketMediatorServiceInterface } from "../../mediator-services/webSocket.mediator.service";
// import { UserRemovedFromTeamSnsProcessorService } from "../userRemovedFromTeam.sns.processor.service";

// describe("UserRemovedFromTeamSnsProcessorService", () => {
//   let loggerService: Spied<LoggerService>;
//   let webSocketMediatorService: Spied<WebSocketMediatorServiceInterface>;
//   let userRemovedFromTeamSnsProcessorService: SnsProcessorServiceInterface;

//   const mockUserRemovedFromTeamSnsTopicArn = "mock-user-removed-from-team-sns-topic-arn";
//   const mockConfig = { snsTopicArns: { userRemovedFromTeam: mockUserRemovedFromTeamSnsTopicArn } };
//   const mockUserIdOne = "user-mock-id-one";
//   const mockUserIdTwo = "user-mock-id-two";
//   const mockTeamMemberIds = [ mockUserIdOne, mockUserIdTwo ];

//   const mockUser: User = {
//     id: mockUserIdOne,
//     image: "mock-image",
//   };

//   const mockTeam: Team = {
//     id: "team-mock-id",
//     name: "mock-name",
//     image: "mock-image",
//     createdBy: "user_mock-id",
//   };

//   const mockRecord = {
//     topicArn: mockUserRemovedFromTeamSnsTopicArn,
//     message: {
//       user: mockUser,
//       team: mockTeam,
//       teamMemberIds: mockTeamMemberIds,
//     },
//   };
//   const mockError = new Error("test");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     webSocketMediatorService = TestSupport.spyOnClass(WebSocketMediatorService);

//     userRemovedFromTeamSnsProcessorService = new UserRemovedFromTeamSnsProcessorService(loggerService, webSocketMediatorService, mockConfig);
//   });

//   describe("determineRecordSupport", () => {
//     describe("under normal conditions", () => {
//       describe("when passed a record with a topic arn matching snsTopicArns.userRemovedFromTeam in the config", () => {
//         it("returns true", () => {
//           const result = userRemovedFromTeamSnsProcessorService.determineRecordSupport(mockRecord);

//           expect(result).toBe(true);
//         });
//       });

//       describe("when passed a record with a topic arn not matching snsTopicArns.userRemovedFromTeam in the config", () => {
//         const record = {
//           ...mockRecord,
//           topicArn: "test",
//         };

//         it("returns false", () => {
//           const result = userRemovedFromTeamSnsProcessorService.determineRecordSupport(record);

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
//         await userRemovedFromTeamSnsProcessorService.processRecord(mockRecord);

//         expect(webSocketMediatorService.sendMessage).toHaveBeenCalledTimes(2);
//         expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdOne, event: WebSocketEvent.UserRemovedFromTeam, data: { team: mockTeam, user: mockUser } });
//         expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdTwo, event: WebSocketEvent.UserRemovedFromTeam, data: { team: mockTeam, user: mockUser } });
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when webSocketMediatorService.sendMessage throws an error", () => {
//         beforeEach(() => {
//           webSocketMediatorService.sendMessage.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await userRemovedFromTeamSnsProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, userRemovedFromTeamSnsProcessorService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await userRemovedFromTeamSnsProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
