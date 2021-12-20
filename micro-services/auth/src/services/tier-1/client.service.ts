import { inject, injectable } from "inversify";
import { Failcode, ValidationError } from "runtypes";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { IdServiceInterface } from "@yac/util/src/services/id.service";
import { TYPES } from "../../inversion-of-control/types";
import { ClientType } from "../../enums/clientType.enum";
import { Client, ClientRepositoryInterface } from "../../repositories/client.dynamo.repository";

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

      const allowedScopesSet = new Set([
        "openid",
        "email",
        "profile",
        "yac/user.read",
        "yac/user.write",
        "yac/user.delete",
        "yac/friend.read",
        "yac/friend.write",
        "yac/friend.delete",
        "yac/team.read",
        "yac/team.write",
        "yac/team.delete",
        "yac/team_member.read",
        "yac/team_member.write",
        "yac/team_member.delete",
        "yac/group.read",
        "yac/group.write",
        "yac/group.delete",
        "yac/group_member.read",
        "yac/group_member.write",
        "yac/group_member.delete",
        "yac/meeting.read",
        "yac/meeting.write",
        "yac/meeting.delete",
        "yac/meeting_member.read",
        "yac/meeting_member.write",
        "yac/meeting_member.delete",
        "yac/message.read",
        "yac/message.write",
        "yac/message.delete",
        "yac/conversation.read",
        "yac/conversation.write",
        "yac/conversation.delete",
      ]);

      const { name, redirectUri, type, scopes } = params;

      const invalidScopes = scopes.filter((scope) => !allowedScopesSet.has(scope));

      if (invalidScopes.length) {
        throw new ValidationError({
          success: false,
          code: Failcode.VALUE_INCORRECT,
          message: "Error validating body.",
          details: { body: { scopes: `Invalid scopes requested: ${invalidScopes.join(", ")}.` } },
        });
      }

      const client: Client = {
        id: this.idService.generateId(),
        name,
        redirectUri,
        type,
        scopes,
        createdAt: new Date().toISOString(),
      };

      if (type === ClientType.Confidential) {
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
