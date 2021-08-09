/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, User, Team } from "@yac/util";
import { NotificationMappingService, NotificationMappingServiceInterface } from "../../entity-services/notificationMapping.service";
import { NotificationMappingType } from "../../enums/notificationMapping.Type.enum";
import { WebsocketEvent } from "../../enums/webSocket.event.enum";
import { WebSocketService, WebSocketServiceInterface } from "../../services/webSocket.service";
import { WebSocketMediatorService, WebSocketMediatorServiceInterface } from "../webSocket.mediator.service";

describe("WebSocketMediatorService", () => {
  let loggerService: Spied<LoggerService>;
  let notificationMappingService: Spied<NotificationMappingServiceInterface>;
  let webSocketService: Spied<WebSocketServiceInterface>;
  let webSocketMediatorService: WebSocketMediatorServiceInterface;

  const mockUserIdOne = "user-mock-id-one";
  const mockUserIdTwo = "user-mock-id-two";
  const mockConnectionIdOne = "mock-connection-id-one";
  const mockConnectionIdTwo = "mock-connection-id-two";

  const mockUser: User = {
    id: mockUserIdOne,
    image: "mock-image",
  };

  const mockTeam: Team = {
    id: "team-mock-id",
    name: "mock-name",
    image: "mock-image",
    createdBy: "user-mock-id",
  };

  const mockError = new Error("test");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    notificationMappingService = TestSupport.spyOnClass(NotificationMappingService);
    webSocketService = TestSupport.spyOnClass(WebSocketService);

    webSocketMediatorService = new WebSocketMediatorService(loggerService, notificationMappingService, webSocketService);
  });

  describe("persistConnectionId", () => {
    const params = { userId: mockUserIdOne, connectionId: mockConnectionIdOne };

    describe("under normal conditions", () => {
      beforeEach(() => {
        notificationMappingService.createNotificationMapping.and.returnValue(Promise.resolve());
      });

      it("calls notificationMappingService.createNotificationMapping with the correct params", async () => {
        await webSocketMediatorService.persistConnectionId(params);

        expect(notificationMappingService.createNotificationMapping).toHaveBeenCalledTimes(1);
        expect(notificationMappingService.createNotificationMapping).toHaveBeenCalledWith({
          userId: mockUserIdOne,
          type: NotificationMappingType.Websocket,
          value: mockConnectionIdOne,
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
            await webSocketMediatorService.persistConnectionId(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in persistConnectionId", { error: mockError, params }, webSocketMediatorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await webSocketMediatorService.persistConnectionId(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getConnectionIdsByUserId", () => {
    const params = { userId: mockUserIdOne };

    describe("under normal conditions", () => {
      beforeEach(() => {
        notificationMappingService.getNotificationMappingsByUserIdAndType.and.returnValue(Promise.resolve({ notificationMappings: [ { value: mockConnectionIdOne } ] }));
      });

      it("calls notificationMappingService.getNotificationMappingsByUserIdAndType with the correct params", async () => {
        await webSocketMediatorService.getConnectionIdsByUserId(params);

        expect(notificationMappingService.getNotificationMappingsByUserIdAndType).toHaveBeenCalledTimes(1);
        expect(notificationMappingService.getNotificationMappingsByUserIdAndType).toHaveBeenCalledWith({
          userId: mockUserIdOne,
          type: NotificationMappingType.Websocket,
        });
      });

      it("returns the connectionIds returned by notificationMappingService", async () => {
        const result = await webSocketMediatorService.getConnectionIdsByUserId(params);

        expect(result).toEqual({ connectionIds: [ mockConnectionIdOne ] });
      });
    });

    describe("under error conditions", () => {
      describe("when notificationMappingService.getNotificationMappingsByUserIdAndType throws an error", () => {
        beforeEach(() => {
          notificationMappingService.getNotificationMappingsByUserIdAndType.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await webSocketMediatorService.getConnectionIdsByUserId(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getConnectionIdsByUserId", { error: mockError, params }, webSocketMediatorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await webSocketMediatorService.getConnectionIdsByUserId(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getConnectionIdsByUserIds", () => {
    const params = { userIds: [ mockUserIdOne, mockUserIdTwo ] };

    describe("under normal conditions", () => {
      beforeEach(() => {
        notificationMappingService.getNotificationMappingsByUserIdAndType.and.returnValues(
          Promise.resolve({ notificationMappings: [ { value: mockConnectionIdOne } ] }),
          Promise.resolve({ notificationMappings: [ { value: mockConnectionIdTwo } ] }),
        );
      });

      it("calls notificationMappingService.getNotificationMappingsByUserIdAndType with the correct params", async () => {
        await webSocketMediatorService.getConnectionIdsByUserIds(params);

        expect(notificationMappingService.getNotificationMappingsByUserIdAndType).toHaveBeenCalledTimes(2);
        expect(notificationMappingService.getNotificationMappingsByUserIdAndType).toHaveBeenCalledWith({
          userId: mockUserIdOne,
          type: NotificationMappingType.Websocket,
        });

        expect(notificationMappingService.getNotificationMappingsByUserIdAndType).toHaveBeenCalledWith({
          userId: mockUserIdTwo,
          type: NotificationMappingType.Websocket,
        });
      });

      it("returns a flattened array of the response of each call to notificationMappingService", async () => {
        const result = await webSocketMediatorService.getConnectionIdsByUserIds(params);

        expect(result).toEqual({ connectionIds: [ mockConnectionIdOne, mockConnectionIdTwo ] });
      });
    });

    describe("under error conditions", () => {
      describe("when this.getConnectionIdsByUserId throws an error", () => {
        beforeEach(() => {
          spyOn(webSocketMediatorService, "getConnectionIdsByUserId").and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await webSocketMediatorService.getConnectionIdsByUserIds(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getConnectionIdsByUserIds", { error: mockError, params }, webSocketMediatorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await webSocketMediatorService.getConnectionIdsByUserIds(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("deleteConnectionId", () => {
    const params = { connectionId: mockConnectionIdOne };

    describe("under normal conditions", () => {
      beforeEach(() => {
        notificationMappingService.getNotificationMappingsByTypeAndValue.and.returnValue(Promise.resolve({ notificationMappings: [ { userId: mockUserIdOne } ] }));
        notificationMappingService.deleteNotificationMapping.and.returnValue(Promise.resolve());
      });

      it("calls notificationMappingService.getNotificationMappingsByTypeAndValue with the correct params", async () => {
        await webSocketMediatorService.deleteConnectionId(params);

        expect(notificationMappingService.getNotificationMappingsByTypeAndValue).toHaveBeenCalledTimes(1);
        expect(notificationMappingService.getNotificationMappingsByTypeAndValue).toHaveBeenCalledWith({
          type: NotificationMappingType.Websocket,
          value: mockConnectionIdOne,
        });
      });

      it("calls notificationMappingService.deleteNotificationMapping with the correct params", async () => {
        await webSocketMediatorService.deleteConnectionId(params);

        expect(notificationMappingService.deleteNotificationMapping).toHaveBeenCalledTimes(1);
        expect(notificationMappingService.deleteNotificationMapping).toHaveBeenCalledWith({
          userId: mockUserIdOne,
          type: NotificationMappingType.Websocket,
          value: mockConnectionIdOne,
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
            await webSocketMediatorService.deleteConnectionId(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in deleteConnectionId", { error: mockError, params }, webSocketMediatorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await webSocketMediatorService.deleteConnectionId(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("sendUserAddedToTeamMessage", () => {
    const params = { connectionId: mockConnectionIdOne, team: mockTeam, user: mockUser };

    describe("under normal conditions", () => {
      beforeEach(() => {
        webSocketService.sendMessage.and.returnValue(Promise.resolve());
      });

      it("calls notificationMappingService.createNotificationMapping with the correct params", async () => {
        await webSocketMediatorService.sendUserAddedToTeamMessage(params);

        expect(webSocketService.sendMessage).toHaveBeenCalledTimes(1);
        expect(webSocketService.sendMessage).toHaveBeenCalledWith({
          connectionId: mockConnectionIdOne,
          event: WebsocketEvent.UserAddedToTeam,
          data: { team: mockTeam, user: mockUser },
        });
      });
    });

    describe("under error conditions", () => {
      describe("when webSocketService.sendMessage throws an error", () => {
        beforeEach(() => {
          webSocketService.sendMessage.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await webSocketMediatorService.sendUserAddedToTeamMessage(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in sendUserAddedToTeamMessage", { error: mockError, params }, webSocketMediatorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await webSocketMediatorService.sendUserAddedToTeamMessage(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
