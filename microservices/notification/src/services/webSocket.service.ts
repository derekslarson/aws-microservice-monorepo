/* eslint-disable max-len */
import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/util";
import { ApiGatewayManagementApi } from "aws-sdk";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { ApiGatewayManagementFactory } from "../factories/apiGatewayManagement.factory";
import { WebSocketEvent } from "../enums/webSocket.event.enum";

@injectable()
export class WebSocketService implements WebSocketServiceInterface {
  private apiGatewayManagementApi: ApiGatewayManagementApi;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: WebSocketServiceConfig,
    @inject(TYPES.ApiGatewayManagementFactory) apiGatewayManagementFactory: ApiGatewayManagementFactory,
  ) {
    this.apiGatewayManagementApi = apiGatewayManagementFactory(config.webSocketApiEndpoint);
  }

  public async sendMessage(params: SendMessageInput): Promise<SendMessageOutput> {
    try {
      this.loggerService.trace("sendMessage called", { params }, this.constructor.name);

      const { connectionId, event, data } = params;

      const stringifiedMessage = JSON.stringify({ event, data });

      await this.apiGatewayManagementApi.postToConnection({ ConnectionId: connectionId, Data: stringifiedMessage }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

type WebSocketServiceConfig = Pick<EnvConfigInterface, "webSocketApiEndpoint">;

export interface WebSocketServiceInterface {
  sendMessage(params: SendMessageInput): Promise<SendMessageOutput>;
}

export interface SendMessageInput {
  connectionId: string;
  event: WebSocketEvent;
  data: Record<string, unknown>;
}

export type SendMessageOutput = void;
