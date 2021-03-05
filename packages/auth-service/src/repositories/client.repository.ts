import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepository, DocumentClientFactory, IdServiceInterface, LoggerServiceInterface, NotFoundError } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { Client } from "../models/client/client.model";
import { EnvConfigInterface } from "../config/env.config";

@injectable()
export class ClientDynamoRepository extends BaseDynamoRepository<Client> implements ClientRepositoryInterface {
  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.IdServiceInterface) idService: IdServiceInterface,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: ClientRepositoryConfigInterface,
  ) {
    super(config.tableNames.clientsTableName, documentClientFactory, idService, loggerService);
  }

  public async createClient(client: Client): Promise<Client> {
    try {
      this.loggerService.trace("createClient called", { client }, this.constructor.name);

      const createdClient = await this.insertWithIdIncluded(client);

      return createdClient;
    } catch (error: unknown) {
      this.loggerService.error("Error in createClient", { error, client }, this.constructor.name);

      throw error;
    }
  }

  public async getClient(id: string): Promise<Client> {
    try {
      this.loggerService.trace("getClient called", { id }, this.constructor.name);

      const group = await this.getByPrimaryKey(id);

      return group;
    } catch (error: unknown) {
      this.loggerService.error("Error in getClient", { error, id }, this.constructor.name);

      if (error instanceof NotFoundError) {
        error.message = `Client with id ${id} not found.`;
      }

      throw error;
    }
  }
}

export type ClientRepositoryConfigInterface = Pick<EnvConfigInterface, "tableNames">;

export interface ClientRepositoryInterface {
  createClient(client: Client): Promise<Client>;
  getClient(id: string): Promise<Client>;
}
