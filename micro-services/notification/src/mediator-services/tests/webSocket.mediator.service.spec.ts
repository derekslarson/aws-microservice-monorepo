/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, User, Team } from "@yac/util";
import { ListenerMappingService, ListenerMappingServiceInterface } from "../../entity-services/listenerMapping.service";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";
import { WebSocketService, WebSocketServiceInterface } from "../../services/webSocket.service";
import { WebSocketMediatorService, WebSocketMediatorServiceInterface } from "../webSocket.mediator.service";

interface WebSocketMediatorServiceWithAnyMethod extends WebSocketMediatorServiceInterface {
  [key: string]: any;
}

describe("WebSocketMediatorService", () => {
  let loggerService: Spied<LoggerService>;
  let listenerMappingService: Spied<ListenerMappingServiceInterface>;
  let webSocketService: Spied<WebSocketServiceInterface>;
  let webSocketMediatorService: WebSocketMediatorServiceWithAnyMethod;

  const mockUserId = "user-mock-id";
  const mockEvent = WebSocketEvent.UserAddedToTeam as const;
  const mockConnectionIdOne = "mock-connection-id-one";
  const mockConnectionIdTwo = "mock-connection-id-two";
  const mockListenerOne = { value: mockConnectionIdOne };
  const mockListenerTwo = { value: mockConnectionIdTwo };

  const mockUser: User = {
    id: mockUserId,
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
    listenerMappingService = TestSupport.spyOnClass(ListenerMappingService);
    webSocketService = TestSupport.spyOnClass(WebSocketService);

    webSocketMediatorService = new WebSocketMediatorService(webSocketService, loggerService, listenerMappingService);
  });

  describe("sendMessage", () => {
    const params = {
      userId: mockUserId,
      event: mockEvent,
      data: { team: mockTeam, user: mockUser },
    };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(webSocketMediatorService, "getListenersByUserId").and.returnValue({ listeners: [ mockListenerOne, mockListenerTwo ] });
        webSocketService.sendMessage.and.returnValue(Promise.resolve());
      });

      it("calls this.getListenersByUserId with the correct params", async () => {
        await webSocketMediatorService.sendMessage(params);

        expect(webSocketMediatorService.getListenersByUserId).toHaveBeenCalledTimes(1);
        expect(webSocketMediatorService.getListenersByUserId).toHaveBeenCalledWith({ userId: mockUserId });
      });

      it("calls webSocketService.sendMessage with the correct params", async () => {
        await webSocketMediatorService.sendMessage(params);

        expect(webSocketService.sendMessage).toHaveBeenCalledTimes(2);
        expect(webSocketService.sendMessage).toHaveBeenCalledWith({
          connectionId: mockConnectionIdOne,
          event: WebSocketEvent.UserAddedToTeam,
          data: { team: mockTeam, user: mockUser },
        });

        expect(webSocketService.sendMessage).toHaveBeenCalledWith({
          connectionId: mockConnectionIdTwo,
          event: WebSocketEvent.UserAddedToTeam,
          data: { team: mockTeam, user: mockUser },
        });
      });
    });

    describe("under error conditions", () => {
      describe("when webSocketService.sendMessage throws an error", () => {
        beforeEach(() => {
          spyOn(webSocketMediatorService, "getListenersByUserId").and.returnValue({ listeners: [ mockListenerOne, mockListenerTwo ] });
          webSocketService.sendMessage.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await webSocketMediatorService.sendMessage(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in sendMessage", { error: mockError, params }, webSocketMediatorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await webSocketMediatorService.sendMessage(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
