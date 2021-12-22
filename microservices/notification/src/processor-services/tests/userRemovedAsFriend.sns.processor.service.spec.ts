// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport, SnsProcessorServiceInterface, User } from "@yac/util";
// import { WebSocketEvent } from "../../enums/webSocket.event.enum";
// import { WebSocketMediatorService, WebSocketMediatorServiceInterface } from "../../mediator-services/webSocket.mediator.service";
// import { UserRemovedAsFriendSnsProcessorService } from "../userRemovedAsFriend.sns.processor.service";

// describe("UserRemovedAsFriendSnsProcessorService", () => {
//   let loggerService: Spied<LoggerService>;
//   let webSocketMediatorService: Spied<WebSocketMediatorServiceInterface>;
//   let userRemovedAsFriendSnsProcessorService: SnsProcessorServiceInterface;

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

//   const mockRecord = {
//     topicArn: mockUserRemovedAsFriendSnsTopicArn,
//     message: {
//       userA: mockUserOne,
//       userB: mockUserTwo,
//     },
//   };
//   const mockError = new Error("test");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     webSocketMediatorService = TestSupport.spyOnClass(WebSocketMediatorService);

//     userRemovedAsFriendSnsProcessorService = new UserRemovedAsFriendSnsProcessorService(loggerService, webSocketMediatorService, mockConfig);
//   });

//   describe("determineRecordSupport", () => {
//     describe("under normal conditions", () => {
//       describe("when passed a record with a topic arn matching snsTopicArns.userRemovedAsFriend in the config", () => {
//         it("returns true", () => {
//           const result = userRemovedAsFriendSnsProcessorService.determineRecordSupport(mockRecord);

//           expect(result).toBe(true);
//         });
//       });

//       describe("when passed a record with a topic arn not matching snsTopicArns.userRemovedAsFriend in the config", () => {
//         const record = {
//           ...mockRecord,
//           topicArn: "test",
//         };

//         it("returns false", () => {
//           const result = userRemovedAsFriendSnsProcessorService.determineRecordSupport(record);

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
//         await userRemovedAsFriendSnsProcessorService.processRecord(mockRecord);

//         expect(webSocketMediatorService.sendMessage).toHaveBeenCalledTimes(2);
//         expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdOne, event: WebSocketEvent.UserRemovedAsFriend, data: { userA: mockUserOne, userB: mockUserTwo } });
//         expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdTwo, event: WebSocketEvent.UserRemovedAsFriend, data: { userA: mockUserOne, userB: mockUserTwo } });
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when webSocketMediatorService.sendMessage throws an error", () => {
//         beforeEach(() => {
//           webSocketMediatorService.sendMessage.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await userRemovedAsFriendSnsProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, userRemovedAsFriendSnsProcessorService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await userRemovedAsFriendSnsProcessorService.processRecord(mockRecord);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
