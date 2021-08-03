/* eslint-disable max-len */
import { inject, injectable } from "inversify";
import { ForbiddenError, HttpRequestServiceInterface, LoggerServiceInterface } from "@yac/util";
import { ApiGatewayManagementApi } from "aws-sdk";
import { TYPES } from "../inversion-of-control/types";
import { UserId } from "../types/userId.type";
import { EnvConfigInterface } from "../config/env.config";
import { ApiGatewayManagementFactory } from "../factories/apiGatewayManagement.factory";

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

      const { connectionId, message } = params;

      const stringifiedMessage = JSON.stringify(message);

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
  message: Record<string, unknown>;
}

export type SendMessageOutput = void;
