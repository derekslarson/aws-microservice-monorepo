import { inject, injectable } from "inversify";
import { CognitoIdentityServiceProvider } from "aws-sdk";
import { ClientsUpdatedSnsServiceInterface, ForbiddenError, LoggerServiceInterface, NotFoundError } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { CreateClientInputDto } from "../models/client/client.creation.input.model";
import { CognitoFactory } from "../factories/cognito.factory";

@injectable()
export class ClientService implements ClientServiceInterface {
  private cognito: CognitoIdentityServiceProvider;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ClientsUpdatedSnsServiceInterface) private clientsUpdatedSnsService: ClientsUpdatedSnsServiceInterface,
    @inject(TYPES.EnvConfigInterface) private config: ClientServiceConfigInterface,
    @inject(TYPES.CognitoFactory) cognitoFactory: CognitoFactory,
  ) {
    this.cognito = cognitoFactory();
  }

  public async createClient(createClientInput: CreateClientInputDto): Promise<{ clientId: string; clientSecret: string; }> {
    try {
      this.loggerService.trace("createClient called", { createClientInput }, this.constructor.name);

      const createClientParams: CognitoIdentityServiceProvider.Types.CreateUserPoolClientRequest = {
        UserPoolId: this.config.userPool.id,
        ClientName: createClientInput.name,
        GenerateSecret: true,
        CallbackURLs: [ createClientInput.redirectUri ],
        SupportedIdentityProviders: [ "COGNITO" ],
        ExplicitAuthFlows: [ "ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH" ],
        AllowedOAuthFlows: [ "code" ],
        AllowedOAuthScopes: createClientInput.scopes,
        AllowedOAuthFlowsUserPoolClient: true,
      };

      const { UserPoolClient } = await this.cognito.createUserPoolClient(createClientParams).promise();

      await this.clientsUpdatedSnsService.sendMessage();

      if (!UserPoolClient || !UserPoolClient.ClientId || !UserPoolClient.ClientSecret) {
        throw new Error("Malformed response from createUserPoolClient");
      }

      return {
        clientId: UserPoolClient.ClientId,
        clientSecret: UserPoolClient.ClientSecret,
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in createClient", { error, createClientInput }, this.constructor.name);

      throw error;
    }
  }

  public async getClient(id: string): Promise<CognitoIdentityServiceProvider.UserPoolClientType> {
    try {
      this.loggerService.trace("getClient called", { id }, this.constructor.name);

      const describeUserPoolClientParams: CognitoIdentityServiceProvider.DescribeUserPoolClientRequest = {
        UserPoolId: this.config.userPool.id,
        ClientId: id,
      };

      const { UserPoolClient } = await this.cognito.describeUserPoolClient(describeUserPoolClientParams).promise();

      if (!UserPoolClient) {
        throw new NotFoundError("UserPoolClient not found.");
      }

      return UserPoolClient;
    } catch (error: unknown) {
      this.loggerService.error("Error in getClient", { error, id }, this.constructor.name);

      throw error;
    }
  }

  public async deleteClient(id: string, secret: string): Promise<void> {
    try {
      this.loggerService.trace("deleteClient called", { id }, this.constructor.name);

      const client = await this.getClient(id);

      if (client.ClientSecret !== secret) {
        throw new ForbiddenError("Forbidden");
      }

      const deleteUserPoolClientParams: CognitoIdentityServiceProvider.DeleteUserPoolClientRequest = {
        UserPoolId: this.config.userPool.id,
        ClientId: id,
      };

      await this.cognito.deleteUserPoolClient(deleteUserPoolClientParams).promise();

      await this.clientsUpdatedSnsService.sendMessage();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteClient", { error, id }, this.constructor.name);

      throw error;
    }
  }
}

export type ClientServiceConfigInterface = Pick<EnvConfigInterface, "userPool">;

export interface ClientServiceInterface {
  createClient(createClientInput: CreateClientInputDto): Promise<{ clientId: string; clientSecret: string; }>;
  getClient(id: string): Promise<CognitoIdentityServiceProvider.UserPoolClientType>;
  deleteClient(id: string, secret: string): Promise<void>;
}
