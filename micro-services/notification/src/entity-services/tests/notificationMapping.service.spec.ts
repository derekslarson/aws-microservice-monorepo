/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport } from "@yac/util";
import { NotificationMappingType } from "../../enums/notificationMapping.Type.enum";
import { NotificationMappingDynamoRepository } from "../../repositories/notificationMapping.dynamo.repository";
import { NotificationMappingService, NotificationMappingServiceInterface } from "../notificationMapping.service";

describe("NotificationMappingService", () => {
  let loggerService: Spied<LoggerService>;
  let notificationMappingRepository: Spied<NotificationMappingDynamoRepository>;
  let notificationMappingService: NotificationMappingServiceInterface;

  const mockUserId = "mock-user-id";
  const mockType = NotificationMappingType.WebSocket;
  const mockValue = "mock-value";
  const mockNotificationMapping = { userId: mockUserId, type: mockType, value: mockValue };
  const mockError = new Error("mock-error");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    notificationMappingRepository = TestSupport.spyOnClass(NotificationMappingDynamoRepository);

    notificationMappingService = new NotificationMappingService(loggerService, notificationMappingRepository);
  });

  describe("createNotificationMapping", () => {
    const params = { userId: mockUserId, type: mockType, value: mockValue };

    describe("under normal conditions", () => {
      beforeEach(() => {
        notificationMappingRepository.createNotificationMapping.and.returnValue(Promise.resolve({}));
      });

      it("calls notificationMappingRepository.createNotificationMapping with the correct params", async () => {
        await notificationMappingService.createNotificationMapping(params);

        expect(notificationMappingRepository.createNotificationMapping).toHaveBeenCalledTimes(1);
        expect(notificationMappingRepository.createNotificationMapping).toHaveBeenCalledWith({ notificationMapping: { userId: mockUserId, type: mockType, value: mockValue } });
      });

      it("returns the notificationMapping entity", async () => {
        const result = await notificationMappingService.createNotificationMapping(params);

        expect(result).toEqual({ notificationMapping: { userId: mockUserId, type: mockType, value: mockValue } });
      });
    });

    describe("under error conditions", () => {
      describe("when notificationMappingRepository.createNotificationMapping throws an error", () => {
        beforeEach(() => {
          notificationMappingRepository.createNotificationMapping.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await notificationMappingService.createNotificationMapping(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in createNotificationMapping", { error: mockError, params }, notificationMappingService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await notificationMappingService.createNotificationMapping(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getNotificationMappingsByUserIdAndType", () => {
    const params = { userId: mockUserId, type: mockType };

    describe("under normal conditions", () => {
      beforeEach(() => {
        notificationMappingRepository.getNotificationMappingsByUserIdAndType.and.returnValue(Promise.resolve({ notificationMappings: [ mockNotificationMapping ] }));
      });

      it("calls notificationMappingRepository.getNotificationMappingsByUserIdAndType with the correct params", async () => {
        await notificationMappingService.getNotificationMappingsByUserIdAndType(params);

        expect(notificationMappingRepository.getNotificationMappingsByUserIdAndType).toHaveBeenCalledTimes(1);
        expect(notificationMappingRepository.getNotificationMappingsByUserIdAndType).toHaveBeenCalledWith({ userId: mockUserId, type: mockType });
      });

      it("returns the notificationMappings returned by the repository", async () => {
        const result = await notificationMappingService.getNotificationMappingsByUserIdAndType(params);

        expect(result).toEqual({ notificationMappings: [ mockNotificationMapping ] });
      });
    });

    describe("under error conditions", () => {
      describe("when notificationMappingRepository.getNotificationMappingsByUserIdAndType throws an error", () => {
        beforeEach(() => {
          notificationMappingRepository.getNotificationMappingsByUserIdAndType.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await notificationMappingService.getNotificationMappingsByUserIdAndType(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getNotificationMappingsByUserIdAndType", { error: mockError, params }, notificationMappingService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await notificationMappingService.getNotificationMappingsByUserIdAndType(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getNotificationMappingsByTypeAndValue", () => {
    const params = { type: mockType, value: mockValue };

    describe("under normal conditions", () => {
      beforeEach(() => {
        notificationMappingRepository.getNotificationMappingsByTypeAndValue.and.returnValue(Promise.resolve({ notificationMappings: [ mockNotificationMapping ] }));
      });

      it("calls notificationMappingRepository.getNotificationMappingsByTypeAndValue with the correct params", async () => {
        await notificationMappingService.getNotificationMappingsByTypeAndValue(params);

        expect(notificationMappingRepository.getNotificationMappingsByTypeAndValue).toHaveBeenCalledTimes(1);
        expect(notificationMappingRepository.getNotificationMappingsByTypeAndValue).toHaveBeenCalledWith({ type: mockType, value: mockValue });
      });

      it("returns the notificationMappings returned by the repository", async () => {
        const result = await notificationMappingService.getNotificationMappingsByTypeAndValue(params);

        expect(result).toEqual({ notificationMappings: [ mockNotificationMapping ] });
      });
    });

    describe("under error conditions", () => {
      describe("when notificationMappingRepository.getNotificationMappingsByTypeAndValue throws an error", () => {
        beforeEach(() => {
          notificationMappingRepository.getNotificationMappingsByTypeAndValue.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await notificationMappingService.getNotificationMappingsByTypeAndValue(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getNotificationMappingsByTypeAndValue", { error: mockError, params }, notificationMappingService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await notificationMappingService.getNotificationMappingsByTypeAndValue(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("deleteNotificationMapping", () => {
    const params = { userId: mockUserId, type: mockType, value: mockValue };

    describe("under normal conditions", () => {
      beforeEach(() => {
        notificationMappingRepository.deleteNotificationMapping.and.returnValue(Promise.resolve({}));
      });

      it("calls notificationMappingRepository.deleteNotificationMapping with the correct params", async () => {
        await notificationMappingService.deleteNotificationMapping(params);

        expect(notificationMappingRepository.deleteNotificationMapping).toHaveBeenCalledTimes(1);
        expect(notificationMappingRepository.deleteNotificationMapping).toHaveBeenCalledWith({ notificationMapping: { userId: mockUserId, type: mockType, value: mockValue } });
      });
    });

    describe("under error conditions", () => {
      describe("when notificationMappingRepository.deleteNotificationMapping throws an error", () => {
        beforeEach(() => {
          notificationMappingRepository.deleteNotificationMapping.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await notificationMappingService.deleteNotificationMapping(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in deleteNotificationMapping", { error: mockError, params }, notificationMappingService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await notificationMappingService.deleteNotificationMapping(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
