// /* eslint-disable @typescript-eslint/unbound-method */
// import { LoggerService, Spied, TestSupport } from "@yac/util";
// import { ListenerMappingService, ListenerMappingServiceInterface } from "../../entity-services/listenerMapping.service";
// import { PushNotificationEvent } from "../../enums/pushNotification.event.enum";
// import { PushNotificationService, PushNotificationServiceInterface } from "../../services/pushNotification.service";
// import { PushNotificationMediatorService, PushNotificationMediatorServiceInterface } from "../pushNotification.mediator.service";

// interface PushNotificationMediatorServiceWithAnyMethod extends PushNotificationMediatorServiceInterface {
//   [key: string]: any;
// }

// describe("PushNotificationMediatorService", () => {
//   let loggerService: Spied<LoggerService>;
//   let listenerMappingService: Spied<ListenerMappingServiceInterface>;
//   let pushNotificationService: Spied<PushNotificationServiceInterface>;
//   let pushNotificationMediatorService: PushNotificationMediatorServiceWithAnyMethod;

//   const mockUserId = "user-mock-id";
//   const mockEvent = PushNotificationEvent.FriendMessageCreated;
//   const mockDeviceIdOne = "mock-device-id-one";
//   const mockDeviceIdTwo = "mock-device-id-two";
//   const mockEndpointArnOne = "mock-endpoint-arn-one";
//   const mockEndpointArnTwo = "mock-endpoint-arn-two";
//   const mockListenerOne = { value: mockDeviceIdOne, valueTwo: mockEndpointArnOne };
//   const mockListenerTwo = { value: mockDeviceIdTwo, valueTwo: mockEndpointArnTwo };
//   const mockToken = "mock-token";

//   const mockTitle = "mock-title";
//   const mockBody = "mock-body";

//   const mockError = new Error("test");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     listenerMappingService = TestSupport.spyOnClass(ListenerMappingService);
//     pushNotificationService = TestSupport.spyOnClass(PushNotificationService);

//     pushNotificationMediatorService = new PushNotificationMediatorService(pushNotificationService, loggerService, listenerMappingService);
//   });

//   describe("registerDevice", () => {
//     const params = {
//       userId: mockUserId,
//       deviceId: mockDeviceIdOne,
//       deviceToken: mockToken,
//     };

//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         spyOn(pushNotificationMediatorService, "deleteListener").and.returnValue();
//         spyOn(pushNotificationMediatorService, "persistListener").and.returnValue();
//         pushNotificationService.createPlatformEndpoint.and.returnValue(Promise.resolve({ endpointArn: mockEndpointArnOne }));
//       });

//       it("calls this.deleteListener with the correct params", async () => {
//         await pushNotificationMediatorService.registerDevice(params);

//         expect(pushNotificationMediatorService.deleteListener).toHaveBeenCalledTimes(1);
//         expect(pushNotificationMediatorService.deleteListener).toHaveBeenCalledWith({ listener: { value: mockDeviceIdOne } });
//       });

//       it("calls pushNotificationService.createPlatformEndpoint with the correct params", async () => {
//         await pushNotificationMediatorService.registerDevice(params);

//         expect(pushNotificationService.createPlatformEndpoint).toHaveBeenCalledTimes(1);
//         expect(pushNotificationService.createPlatformEndpoint).toHaveBeenCalledWith({ token: mockToken });
//       });

//       it("calls this.persistListener with the correct params", async () => {
//         await pushNotificationMediatorService.registerDevice(params);

//         expect(pushNotificationMediatorService.persistListener).toHaveBeenCalledTimes(1);
//         expect(pushNotificationMediatorService.persistListener).toHaveBeenCalledWith({ userId: mockUserId, listener: { value: mockDeviceIdOne, valueTwo: mockEndpointArnOne } });
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when pushNotificationService.createPlatformEndpoint throws an error", () => {
//         beforeEach(() => {
//           spyOn(pushNotificationMediatorService, "deleteListener").and.returnValue();
//           spyOn(pushNotificationMediatorService, "persistListener").and.returnValue();
//           pushNotificationService.createPlatformEndpoint.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await pushNotificationMediatorService.registerDevice(params);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in registerDevice", { error: mockError, params }, pushNotificationMediatorService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await pushNotificationMediatorService.registerDevice(params);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });

//   describe("sendPushNotification", () => {
//     const params = {
//       userId: mockUserId,
//       event: mockEvent,
//       title: mockTitle,
//       body: mockBody,
//     };

//     describe("under normal conditions", () => {
//       beforeEach(() => {
//         spyOn(pushNotificationMediatorService, "getListenersByUserId").and.returnValue({ listeners: [ mockListenerOne, mockListenerTwo ] });
//         pushNotificationService.sendPushNotification.and.returnValue(Promise.resolve());
//       });

//       it("calls this.getListenersByUserId with the correct params", async () => {
//         await pushNotificationMediatorService.sendPushNotification(params);

//         expect(pushNotificationMediatorService.getListenersByUserId).toHaveBeenCalledTimes(1);
//         expect(pushNotificationMediatorService.getListenersByUserId).toHaveBeenCalledWith({ userId: mockUserId });
//       });

//       it("calls pushNotificationService.sendPushNotification with the correct params", async () => {
//         await pushNotificationMediatorService.sendPushNotification(params);

//         expect(pushNotificationService.sendPushNotification).toHaveBeenCalledTimes(2);
//         expect(pushNotificationService.sendPushNotification).toHaveBeenCalledWith({
//           endpointArn: mockEndpointArnOne,
//           event: mockEvent,
//           title: mockTitle,
//           body: mockBody,
//         });

//         expect(pushNotificationService.sendPushNotification).toHaveBeenCalledWith({
//           endpointArn: mockEndpointArnTwo,
//           event: mockEvent,
//           title: mockTitle,
//           body: mockBody,
//         });
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when pushNotificationService.sendPushNotification throws an error", () => {
//         beforeEach(() => {
//           spyOn(pushNotificationMediatorService, "getListenersByUserId").and.returnValue({ listeners: [ mockListenerOne, mockListenerTwo ] });
//           pushNotificationService.sendPushNotification.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await pushNotificationMediatorService.sendPushNotification(params);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in sendPushNotification", { error: mockError, params }, pushNotificationMediatorService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await pushNotificationMediatorService.sendPushNotification(params);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });
// });
