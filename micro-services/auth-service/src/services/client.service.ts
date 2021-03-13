import { inject, injectable } from "inversify";
import { CognitoIdentityServiceProvider } from "aws-sdk";
import { ForbiddenError, LoggerServiceInterface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { CreateClientInputDto } from "../models/client/client.creation.input.model";
import { CognitoFactory } from "../factories/cognito.factory";
import { ClientRepositoryInterface } from "../repositories/client.repository";
import { Client } from "../models/client/client.model";

@injectable()
export class ClientService implements ClientServiceInterface {
  private cognito: CognitoIdentityServiceProvider;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ClientRepositoryInterface) private clientRepository: ClientRepositoryInterface,
    @inject(TYPES.EnvConfigInterface) private config: ClientServiceConfigInterface,
    @inject(TYPES.CognitoFactory) cognitoFactory: CognitoFactory,
  ) {
    this.cognito = cognitoFactory();
  }

  public async createClient(createClientInput: CreateClientInputDto): Promise<Client> {
    try {
      this.loggerService.trace("createClient called", { createClientInput }, this.constructor.name);

      const createClientParams: CognitoIdentityServiceProvider.Types.CreateUserPoolClientRequest = {
        UserPoolId: this.config.userPool.id,
        ClientName: createClientInput.name,
        GenerateSecret: true,
        CallbackURLs: [ createClientInput.redirectUri ],
        SupportedIdentityProviders: [ "COGNITO" ],
        ExplicitAuthFlows: [ "ALLOW_USER_PASSWORD_AUTH", "ALLOW_CUSTOM_AUTH", "ALLOW_REFRESH_TOKEN_AUTH" ],
        AllowedOAuthFlows: [ "code" ],
        AllowedOAuthScopes: createClientInput.scopes,
        AllowedOAuthFlowsUserPoolClient: true,
      };

      const { UserPoolClient } = await this.cognito.createUserPoolClient(createClientParams).promise();

      if (!UserPoolClient || !UserPoolClient.ClientId || !UserPoolClient.ClientSecret) {
        throw new Error("Malformed response from createUserPoolClient");
      }

      const client: Client = {
        id: UserPoolClient.ClientId,
        secret: UserPoolClient.ClientSecret,
        redirectUri: createClientInput.redirectUri,
        name: createClientInput.name,
      };

      await this.clientRepository.createClient(client);

      return client;
    } catch (error: unknown) {
      this.loggerService.error("Error in createClient", { error, createClientInput }, this.constructor.name);

      throw error;
    }
  }

  public async getClient(id: string): Promise<Client> {
    try {
      this.loggerService.trace("getClient called", { id }, this.constructor.name);

      const client = await this.clientRepository.getClient(id);

      return client;
    } catch (error: unknown) {
      this.loggerService.error("Error in getClient", { error, id }, this.constructor.name);

      throw error;
    }
  }

  public async deleteClient(id: string, secret: string): Promise<void> {
    try {
      this.loggerService.trace("deleteClient called", { id }, this.constructor.name);

      const client = await this.clientRepository.getClient(id);

      if (client.secret !== secret) {
        throw new ForbiddenError("Forbidden");
      }

      await this.clientRepository.deleteClient(id);
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteClient", { error, id }, this.constructor.name);

      throw error;
    }
  }
}

export type ClientServiceConfigInterface = Pick<EnvConfigInterface, "userPool">;

export interface ClientServiceInterface {
  createClient(createClientInput: CreateClientInputDto): Promise<Client>;
  getClient(id: string): Promise<Client>;
  deleteClient(id: string, secret: string): Promise<void>;
}
