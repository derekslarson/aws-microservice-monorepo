/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport } from "@yac/util";
import { ListenerType } from "../../enums/listenerType.enum";
import { ListenerMappingDynamoRepository } from "../../repositories/listenerMapping.dynamo.repository";
import { ListenerMappingService, ListenerMappingServiceInterface } from "../listenerMapping.service";

describe("ListenerMappingService", () => {
  let loggerService: Spied<LoggerService>;
  let listenerMappingRepository: Spied<ListenerMappingDynamoRepository>;
  let listenerMappingService: ListenerMappingServiceInterface;

  const mockUserId = "mock-user-id";
  const mockType = ListenerType.WebSocket;
  const mockValue = "mock-value";
  const mockValueTwo = "mock-value-two";
  const mockListenerMapping = { userId: mockUserId, type: mockType, value: mockValue };
  const mockError = new Error("mock-error");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    listenerMappingRepository = TestSupport.spyOnClass(ListenerMappingDynamoRepository);

    listenerMappingService = new ListenerMappingService(loggerService, listenerMappingRepository);
  });

  describe("createListenerMapping", () => {
    const params = { userId: mockUserId, type: mockType, value: mockValue, valueTwo: mockValueTwo };

    describe("under normal conditions", () => {
      beforeEach(() => {
        listenerMappingRepository.createListenerMapping.and.returnValue(Promise.resolve({}));
      });

      it("calls listenerMappingRepository.createListenerMapping with the correct params", async () => {
        await listenerMappingService.createListenerMapping(params);

        expect(listenerMappingRepository.createListenerMapping).toHaveBeenCalledTimes(1);
        expect(listenerMappingRepository.createListenerMapping).toHaveBeenCalledWith({ listenerMapping: { userId: mockUserId, type: mockType, value: mockValue, valueTwo: mockValueTwo } });
      });

      it("returns the listenerMapping entity", async () => {
        const result = await listenerMappingService.createListenerMapping(params);

        expect(result).toEqual({ listenerMapping: { userId: mockUserId, type: mockType, value: mockValue, valueTwo: mockValueTwo } });
      });
    });

    describe("under error conditions", () => {
      describe("when listenerMappingRepository.createListenerMapping throws an error", () => {
        beforeEach(() => {
          listenerMappingRepository.createListenerMapping.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await listenerMappingService.createListenerMapping(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in createListenerMapping", { error: mockError, params }, listenerMappingService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await listenerMappingService.createListenerMapping(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getListenerMappingsByUserIdAndType", () => {
    const params = { userId: mockUserId, type: mockType };

    describe("under normal conditions", () => {
      beforeEach(() => {
        listenerMappingRepository.getListenerMappingsByUserIdAndType.and.returnValue(Promise.resolve({ listenerMappings: [ mockListenerMapping ] }));
      });

      it("calls listenerMappingRepository.getListenerMappingsByUserIdAndType with the correct params", async () => {
        await listenerMappingService.getListenerMappingsByUserIdAndType(params);

        expect(listenerMappingRepository.getListenerMappingsByUserIdAndType).toHaveBeenCalledTimes(1);
        expect(listenerMappingRepository.getListenerMappingsByUserIdAndType).toHaveBeenCalledWith({ userId: mockUserId, type: mockType });
      });

      it("returns the listenerMappings returned by the repository", async () => {
        const result = await listenerMappingService.getListenerMappingsByUserIdAndType(params);

        expect(result).toEqual({ listenerMappings: [ mockListenerMapping ] });
      });
    });

    describe("under error conditions", () => {
      describe("when listenerMappingRepository.getListenerMappingsByUserIdAndType throws an error", () => {
        beforeEach(() => {
          listenerMappingRepository.getListenerMappingsByUserIdAndType.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await listenerMappingService.getListenerMappingsByUserIdAndType(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getListenerMappingsByUserIdAndType", { error: mockError, params }, listenerMappingService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await listenerMappingService.getListenerMappingsByUserIdAndType(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getListenerMappingsByTypeAndValue", () => {
    const params = { type: mockType, value: mockValue };

    describe("under normal conditions", () => {
      beforeEach(() => {
        listenerMappingRepository.getListenerMappingsByTypeAndValue.and.returnValue(Promise.resolve({ listenerMappings: [ mockListenerMapping ] }));
      });

      it("calls listenerMappingRepository.getListenerMappingsByTypeAndValue with the correct params", async () => {
        await listenerMappingService.getListenerMappingsByTypeAndValue(params);

        expect(listenerMappingRepository.getListenerMappingsByTypeAndValue).toHaveBeenCalledTimes(1);
        expect(listenerMappingRepository.getListenerMappingsByTypeAndValue).toHaveBeenCalledWith({ type: mockType, value: mockValue });
      });

      it("returns the listenerMappings returned by the repository", async () => {
        const result = await listenerMappingService.getListenerMappingsByTypeAndValue(params);

        expect(result).toEqual({ listenerMappings: [ mockListenerMapping ] });
      });
    });

    describe("under error conditions", () => {
      describe("when listenerMappingRepository.getListenerMappingsByTypeAndValue throws an error", () => {
        beforeEach(() => {
          listenerMappingRepository.getListenerMappingsByTypeAndValue.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await listenerMappingService.getListenerMappingsByTypeAndValue(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getListenerMappingsByTypeAndValue", { error: mockError, params }, listenerMappingService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await listenerMappingService.getListenerMappingsByTypeAndValue(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("deleteListenerMapping", () => {
    const params = { userId: mockUserId, type: mockType, value: mockValue };

    describe("under normal conditions", () => {
      beforeEach(() => {
        listenerMappingRepository.deleteListenerMapping.and.returnValue(Promise.resolve({}));
      });

      it("calls listenerMappingRepository.deleteListenerMapping with the correct params", async () => {
        await listenerMappingService.deleteListenerMapping(params);

        expect(listenerMappingRepository.deleteListenerMapping).toHaveBeenCalledTimes(1);
        expect(listenerMappingRepository.deleteListenerMapping).toHaveBeenCalledWith({ userId: mockUserId, type: mockType, value: mockValue });
      });
    });

    describe("under error conditions", () => {
      describe("when listenerMappingRepository.deleteListenerMapping throws an error", () => {
        beforeEach(() => {
          listenerMappingRepository.deleteListenerMapping.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await listenerMappingService.deleteListenerMapping(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in deleteListenerMapping", { error: mockError, params }, listenerMappingService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await listenerMappingService.deleteListenerMapping(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
