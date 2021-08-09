/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, LoggerServiceInterface } from "@yac/util";
import { NotificationMappingService, NotificationMappingServiceInterface } from "../../entity-services/notificationMapping.service";
import { NotificationType } from "../../enums/notificationType.enum";
import { BaseIntegrationMediatorService, GetListenersByUserIdInput } from "../base.integration.mediator.service";

describe("BaseIntegrationMediatorService", () => {
  const mockNotficationType = NotificationType.WebSocket;

  class IntegrationMediatorService extends BaseIntegrationMediatorService {
    constructor(loggerService: LoggerServiceInterface, notificationMappingService: NotificationMappingServiceInterface) {
      super(mockNotficationType, loggerService, notificationMappingService);
    }

    public getListenersByUserId(params: GetListenersByUserIdInput) {
      return super.getListenersByUserId(params);
    }
  }

  let loggerService: Spied<LoggerService>;
  let notificationMappingService: Spied<NotificationMappingServiceInterface>;
  let integrationMediatorService: IntegrationMediatorService;

  const mockUserId = "user-mock-id";
  const mockListener = "mock-listener";

  const mockError = new Error("test");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    notificationMappingService = TestSupport.spyOnClass(NotificationMappingService);

    integrationMediatorService = new IntegrationMediatorService(loggerService, notificationMappingService);
  });

  describe("persistListener", () => {
    const params = { userId: mockUserId, listener: mockListener };

    describe("under normal conditions", () => {
      beforeEach(() => {
        notificationMappingService.createNotificationMapping.and.returnValue(Promise.resolve());
      });

      it("calls notificationMappingService.createNotificationMapping with the correct params", async () => {
        await integrationMediatorService.persistListener(params);

        expect(notificationMappingService.createNotificationMapping).toHaveBeenCalledTimes(1);
        expect(notificationMappingService.createNotificationMapping).toHaveBeenCalledWith({
          userId: mockUserId,
          type: mockNotficationType,
          value: mockListener,
        });
      });
    });

    describe("under error conditions", () => {
      describe("when notificationMappingService.createNotificationMapping throws an error", () => {
        beforeEach(() => {
          notificationMappingService.createNotificationMapping.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await integrationMediatorService.persistListener(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in persistListener", { error: mockError, params }, integrationMediatorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await integrationMediatorService.persistListener(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getListenersByUserId", () => {
    const params = { userId: mockUserId };

    describe("under normal conditions", () => {
      beforeEach(() => {
        notificationMappingService.getNotificationMappingsByUserIdAndType.and.returnValue(Promise.resolve({ notificationMappings: [ { value: mockListener } ] }));
      });

      it("calls notificationMappingService.getNotificationMappingsByUserIdAndType with the correct params", async () => {
        await integrationMediatorService.getListenersByUserId(params);

        expect(notificationMappingService.getNotificationMappingsByUserIdAndType).toHaveBeenCalledTimes(1);
        expect(notificationMappingService.getNotificationMappingsByUserIdAndType).toHaveBeenCalledWith({
          userId: mockUserId,
          type: mockNotficationType,
        });
      });

      it("returns the listeners returned by notificationMappingService", async () => {
        const result = await integrationMediatorService.getListenersByUserId(params);

        expect(result).toEqual({ listeners: [ mockListener ] });
      });
    });

    describe("under error conditions", () => {
      describe("when notificationMappingService.getNotificationMappingsByUserIdAndType throws an error", () => {
        beforeEach(() => {
          notificationMappingService.getNotificationMappingsByUserIdAndType.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await integrationMediatorService.getListenersByUserId(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getListenersByUserId", { error: mockError, params }, integrationMediatorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await integrationMediatorService.getListenersByUserId(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("deleteListener", () => {
    const params = { listener: mockListener };

    describe("under normal conditions", () => {
      beforeEach(() => {
        notificationMappingService.getNotificationMappingsByTypeAndValue.and.returnValue(Promise.resolve({ notificationMappings: [ { userId: mockUserId } ] }));
        notificationMappingService.deleteNotificationMapping.and.returnValue(Promise.resolve());
      });

      it("calls notificationMappingService.getNotificationMappingsByTypeAndValue with the correct params", async () => {
        await integrationMediatorService.deleteListener(params);

        expect(notificationMappingService.getNotificationMappingsByTypeAndValue).toHaveBeenCalledTimes(1);
        expect(notificationMappingService.getNotificationMappingsByTypeAndValue).toHaveBeenCalledWith({
          type: mockNotficationType,
          value: mockListener,
        });
      });

      it("calls notificationMappingService.deleteNotificationMapping with the correct params", async () => {
        await integrationMediatorService.deleteListener(params);

        expect(notificationMappingService.deleteNotificationMapping).toHaveBeenCalledTimes(1);
        expect(notificationMappingService.deleteNotificationMapping).toHaveBeenCalledWith({
          userId: mockUserId,
          type: mockNotficationType,
          value: mockListener,
        });
      });
    });

    describe("under error conditions", () => {
      describe("when notificationMappingService.getNotificationMappingsByTypeAndValue throws an error", () => {
        beforeEach(() => {
          notificationMappingService.getNotificationMappingsByTypeAndValue.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await integrationMediatorService.deleteListener(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in deleteListener", { error: mockError, params }, integrationMediatorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await integrationMediatorService.deleteListener(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
