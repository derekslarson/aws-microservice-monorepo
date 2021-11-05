import { inject, injectable } from "inversify";
import { ForbiddenError, LoggerServiceInterface, NotFoundError } from "@yac/util";
import CognitoIdentityServiceProvider from "aws-sdk/clients/cognitoidentityserviceprovider";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { CognitoFactory } from "../factories/cognito.factory";
import { ClientType } from "../enums/clientType.enum";

@injectable()
export class ClientService implements ClientServiceInterface {
  private cognito: CognitoIdentityServiceProvider;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) private config: ClientServiceConfigInterface,
    @inject(TYPES.CognitoFactory) cognitoFactory: CognitoFactory,
  ) {
    this.cognito = cognitoFactory();
  }

  public async createClient(params: CreateClientInput): Promise<CreateClientOutput> {
    try {
      this.loggerService.trace("createClient called", { params }, this.constructor.name);

      const { name, redirectUri, type, scopes } = params;

      const createClientParams: CognitoIdentityServiceProvider.Types.CreateUserPoolClientRequest = {
        UserPoolId: this.config.userPool.id,
        ClientName: name,
        GenerateSecret: type === ClientType.Private,
        CallbackURLs: [ redirectUri ],
        SupportedIdentityProviders: [ "COGNITO", "Google" ],
        ExplicitAuthFlows: [ "ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH" ],
        AllowedOAuthFlows: [ "code" ],
        AllowedOAuthScopes: scopes,
        AllowedOAuthFlowsUserPoolClient: true,
      };

      const { UserPoolClient } = await this.cognito.createUserPoolClient(createClientParams).promise();

      if (!UserPoolClient || !UserPoolClient.ClientId) {
        throw new Error("Malformed response from createUserPoolClient");
      }

      return {
        clientId: UserPoolClient.ClientId,
        clientSecret: UserPoolClient.ClientSecret,
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in createClient", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getClient(params: GetClientInput): Promise<GetClientOutput> {
    try {
      this.loggerService.trace("getClient called", { params }, this.constructor.name);

      const { clientId } = params;

      const describeUserPoolClientParams: CognitoIdentityServiceProvider.DescribeUserPoolClientRequest = {
        UserPoolId: this.config.userPool.id,
        ClientId: clientId,
      };

      const { UserPoolClient } = await this.cognito.describeUserPoolClient(describeUserPoolClientParams).promise();

      if (!UserPoolClient) {
        throw new NotFoundError("Client not found.");
      }

      return { client: UserPoolClient };
    } catch (error: unknown) {
      this.loggerService.error("Error in getClient", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteClient(params: DeleteClientInput): Promise<DeleteClientOutput> {
    try {
      this.loggerService.trace("deleteClient called", { params }, this.constructor.name);

      const { clientId, clientSecret } = params;

      const { client } = await this.getClient({ clientId });

      if (client.ClientSecret !== clientSecret) {
        throw new ForbiddenError("Forbidden");
      }

      const deleteUserPoolClientParams: CognitoIdentityServiceProvider.DeleteUserPoolClientRequest = {
        UserPoolId: this.config.userPool.id,
        ClientId: clientSecret,
      };

      await this.cognito.deleteUserPoolClient(deleteUserPoolClientParams).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteClient", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export type ClientServiceConfigInterface = Pick<EnvConfigInterface, "userPool">;

export interface ClientServiceInterface {
  createClient(params: CreateClientInput): Promise<CreateClientOutput>;
  getClient(params: GetClientInput): Promise<GetClientOutput>;
  deleteClient(params: DeleteClientInput): Promise<DeleteClientOutput>;
}

export interface CreateClientInput {
  name: string;
  redirectUri: string;
  scopes: string[];
  type: ClientType;
}

export interface CreateClientOutput {
  clientId: string;
  clientSecret?: string;
}

export interface GetClientInput {
  clientId: string;
}

export interface GetClientOutput {
  client: CognitoIdentityServiceProvider.UserPoolClientType;
}

export interface DeleteClientInput {
  clientId: string;
  clientSecret: string;
}

export type DeleteClientOutput = void;
