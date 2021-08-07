/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, generateAwsResponse } from "@yac/util";
import { ApiGatewayManagementApi } from "aws-sdk";
import { WebsocketEvent } from "../../enums/webSocket.event.enum";
import { ApiGatewayManagementFactory } from "../../factories/apiGatewayManagement.factory";
import { WebSocketService, WebSocketServiceInterface } from "../webSocket.service";

fdescribe("WebSocketService", () => {
  let apiGatewayManagement: Spied<ApiGatewayManagementApi>;
  const apiGatewayManagementFactory: ApiGatewayManagementFactory = () => apiGatewayManagement as unknown as ApiGatewayManagementApi;

  let loggerService: Spied<LoggerService>;
  let webSocketService: WebSocketServiceInterface;

  const mockWebSocketApiEndpoint = "mock-websocket-api-endpoint";
  const mockConfig = { webSocketApiEndpoint: mockWebSocketApiEndpoint };
  const mockEvent = WebsocketEvent.UserAddedToTeam;
  const mockConnectionId = "mock-connection-id";
  const mockData = {};
  const mockError = new Error("test");

  beforeEach(() => {
    apiGatewayManagement = TestSupport.spyOnObject(new ApiGatewayManagementApi());
    loggerService = TestSupport.spyOnClass(LoggerService);

    webSocketService = new WebSocketService(loggerService, mockConfig, apiGatewayManagementFactory);
  });

  describe("sendMessage", () => {
    const params = { event: mockEvent, connectionId: mockConnectionId, data: mockData };

    describe("under normal conditions", () => {
      beforeEach(() => {
        apiGatewayManagement.postToConnection.and.returnValue(generateAwsResponse({}));
      });

      it("calls apiGatewayManagement.postToConnection with the correct params", async () => {
        await webSocketService.sendMessage(params);

        expect(apiGatewayManagement.postToConnection).toHaveBeenCalledTimes(1);
        expect(apiGatewayManagement.postToConnection).toHaveBeenCalledWith({
          ConnectionId: mockConnectionId,
          Data: JSON.stringify({ event: mockEvent, data: mockData }),
        });
      });
    });

    describe("under error conditions", () => {
      describe("when ses.sendEmail throws an error", () => {
        beforeEach(() => {
          apiGatewayManagement.postToConnection.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await webSocketService.sendMessage(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in sendMessage", { error: mockError, params }, webSocketService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await webSocketService.sendMessage(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
