import { inject, injectable } from "inversify";
import { IdServiceInterface, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { ClientType } from "../enums/clientType.enum";
import { Client, ClientRepositoryInterface } from "../repositories/client.dynamo.repository";

@injectable()
export class ClientService implements ClientServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.ClientRepositoryInterface) private clientRepository: ClientRepositoryInterface,
  ) {}

  public async createClient(params: CreateClientInput): Promise<CreateClientOutput> {
    try {
      this.loggerService.trace("createClient called", { params }, this.constructor.name);

      const { name, redirectUri, type, scopes } = params;

      const client: Client = {
        id: this.idService.generateId(),
        name,
        redirectUri,
        type,
        scopes,
        createdAt: new Date().toISOString(),
      };

      if (type === ClientType.Private) {
        client.secret = this.idService.generateId();
      }

      await this.clientRepository.createClient({ client });

      return { client };
    } catch (error: unknown) {
      this.loggerService.error("Error in createClient", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getClient(params: GetClientInput): Promise<GetClientOutput> {
    try {
      this.loggerService.trace("getClient called", { params }, this.constructor.name);

      const { clientId } = params;

      const { client } = await this.clientRepository.getClient({ id: clientId });

      return { client };
    } catch (error: unknown) {
      this.loggerService.error("Error in getClient", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface ClientServiceInterface {
  createClient(params: CreateClientInput): Promise<CreateClientOutput>;
  getClient(params: GetClientInput): Promise<GetClientOutput>;
}

export interface CreateClientInput {
  name: string;
  redirectUri: string;
  scopes: string[];
  type: ClientType;
}

export interface CreateClientOutput {
  client: Client;
}

export interface GetClientInput {
  clientId: string;
}

export interface GetClientOutput {
  client: Client;
}

export interface DeleteClientInput {
  clientId: string;
  clientSecret: string;
}

export type DeleteClientOutput = void;
