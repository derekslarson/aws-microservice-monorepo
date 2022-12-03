import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2 } from "@yac/util/src/repositories/base.dynamo.repository.v2";
import { DocumentClientFactory } from "@yac/util/src/factories/documentClient.factory";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";
import { ClientType } from "../enums/clientType.enum";

@injectable()
export class ClientDynamoRepository extends BaseDynamoRepositoryV2<Client> implements ClientRepositoryInterface {
  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: ClientRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.auth, loggerService);
  }

  public async createClient(params: CreateClientInput): Promise<CreateClientOutput> {
    try {
      this.loggerService.trace("createClient called", { params }, this.constructor.name);

      const { client } = params;

      const clientEntity: RawClient = {
        entityType: EntityType.Client,
        pk: client.id,
        sk: EntityType.Client,
        ...client,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        Item: clientEntity,
      }).promise();

      return { client };
    } catch (error: unknown) {
      this.loggerService.error("Error in createClient", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getClient(params: GetClientInput): Promise<GetClientOutput> {
    try {
      this.loggerService.trace("getClient called", { params }, this.constructor.name);

      const { id } = params;

      const client = await this.get({ Key: { pk: id, sk: EntityType.Client } }, "Client");

      return { client };
    } catch (error: unknown) {
      this.loggerService.error("Error in getClient", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteClient(params: DeleteClientInput): Promise<DeleteClientOutput> {
    try {
      this.loggerService.trace("deleteClient called", { params }, this.constructor.name);

      const { id } = params;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: id, sk: EntityType.Client },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteClient", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface ClientRepositoryInterface {
  createClient(params: CreateClientInput): Promise<CreateClientOutput>;
  getClient(params: GetClientInput): Promise<GetClientOutput>;
  deleteClient(params: DeleteClientInput): Promise<DeleteClientOutput>;
}

type ClientRepositoryConfig = Pick<EnvConfigInterface, "tableNames">;

export interface Client {
  id: string;
  type: ClientType;
  redirectUri: string;
  scopes: string[];
  name: string;
  createdAt: string;
  secret?: string
}

export interface RawClient extends Client {
  entityType: EntityType.Client;
  // clientId
  pk: string;
  sk: EntityType.Client;
}

export interface CreateClientInput {
  client: Client;
}

export interface CreateClientOutput {
  client: Client;
}

export interface GetClientInput {
  id: string;
}

export interface GetClientOutput {
  client: Client;
}

export interface DeleteClientInput {
  id: string;
}

export type DeleteClientOutput = void;
