/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, LoggerServiceInterface } from "@yac/util";
import { ListenerMappingService, ListenerMappingServiceInterface } from "../../entity-services/listenerMapping.service";
import { ListenerType } from "../../enums/listenerType.enum";
import { BaseIntegrationMediatorService, GetListenersByUserIdInput } from "../base.integration.mediator.service";

describe("BaseIntegrationMediatorService", () => {
  const mockNotficationType = ListenerType.WebSocket;

  class IntegrationMediatorService extends BaseIntegrationMediatorService {
    constructor(loggerService: LoggerServiceInterface, listenerMappingService: ListenerMappingServiceInterface) {
      super(mockNotficationType, loggerService, listenerMappingService);
    }

    public override getListenersByUserId(params: GetListenersByUserIdInput) {
      return super.getListenersByUserId(params);
    }
  }

  let loggerService: Spied<LoggerService>;
  let listenerMappingService: Spied<ListenerMappingServiceInterface>;
  let integrationMediatorService: IntegrationMediatorService;

  const mockUserId = "user-mock-id";
  const mockListenerValue = "mock-listener-value";
  const mockListenerValueTwo = "mock-listener-value-two";
  const mockListener = { value: mockListenerValue, valueTwo: mockListenerValueTwo };

  const mockError = new Error("test");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    listenerMappingService = TestSupport.spyOnClass(ListenerMappingService);

    integrationMediatorService = new IntegrationMediatorService(loggerService, listenerMappingService);
  });

  describe("persistListener", () => {
    const params = { userId: mockUserId, listener: mockListener };

    describe("under normal conditions", () => {
      beforeEach(() => {
        listenerMappingService.createListenerMapping.and.returnValue(Promise.resolve());
      });

      it("calls listenerMappingService.createListenerMapping with the correct params", async () => {
        await integrationMediatorService.persistListener(params);

        expect(listenerMappingService.createListenerMapping).toHaveBeenCalledTimes(1);
        expect(listenerMappingService.createListenerMapping).toHaveBeenCalledWith({
          userId: mockUserId,
          type: mockNotficationType,
          value: mockListener.value,
          valueTwo: mockListener.valueTwo,
        });
      });
    });

    describe("under error conditions", () => {
      describe("when listenerMappingService.createListenerMapping throws an error", () => {
        beforeEach(() => {
          listenerMappingService.createListenerMapping.and.throwError(mockError);
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
        listenerMappingService.getListenerMappingsByUserIdAndType.and.returnValue(Promise.resolve({ listenerMappings: [ { value: mockListenerValue, valueTwo: mockListenerValueTwo } ] }));
      });

      it("calls listenerMappingService.getListenerMappingsByUserIdAndType with the correct params", async () => {
        await integrationMediatorService.getListenersByUserId(params);

        expect(listenerMappingService.getListenerMappingsByUserIdAndType).toHaveBeenCalledTimes(1);
        expect(listenerMappingService.getListenerMappingsByUserIdAndType).toHaveBeenCalledWith({
          userId: mockUserId,
          type: mockNotficationType,
        });
      });

      it("returns the listeners returned by listenerMappingService", async () => {
        const result = await integrationMediatorService.getListenersByUserId(params);

        expect(result).toEqual({ listeners: [ mockListener ] });
      });
    });

    describe("under error conditions", () => {
      describe("when listenerMappingService.getListenerMappingsByUserIdAndType throws an error", () => {
        beforeEach(() => {
          listenerMappingService.getListenerMappingsByUserIdAndType.and.throwError(mockError);
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
        listenerMappingService.getListenerMappingsByTypeAndValue.and.returnValue(Promise.resolve({ listenerMappings: [ { userId: mockUserId, value: mockListenerValue } ] }));
        listenerMappingService.deleteListenerMapping.and.returnValue(Promise.resolve());
      });

      it("calls listenerMappingService.getListenerMappingsByTypeAndValue with the correct params", async () => {
        await integrationMediatorService.deleteListener(params);

        expect(listenerMappingService.getListenerMappingsByTypeAndValue).toHaveBeenCalledTimes(1);
        expect(listenerMappingService.getListenerMappingsByTypeAndValue).toHaveBeenCalledWith({
          type: mockNotficationType,
          value: mockListenerValue,
        });
      });

      it("calls listenerMappingService.deleteListenerMapping with the correct params", async () => {
        await integrationMediatorService.deleteListener(params);

        expect(listenerMappingService.deleteListenerMapping).toHaveBeenCalledTimes(1);
        expect(listenerMappingService.deleteListenerMapping).toHaveBeenCalledWith({
          userId: mockUserId,
          type: mockNotficationType,
          value: mockListenerValue,
        });
      });
    });

    describe("under error conditions", () => {
      describe("when listenerMappingService.getListenerMappingsByTypeAndValue throws an error", () => {
        beforeEach(() => {
          listenerMappingService.getListenerMappingsByTypeAndValue.and.throwError(mockError);
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
