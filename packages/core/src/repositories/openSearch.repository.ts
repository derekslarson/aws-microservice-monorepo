import "reflect-metadata";
import { injectable, inject } from "inversify";
import { Axios, AxiosFactory } from "@yac/util/src/factories/axios.factory";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { UserId } from "@yac/util/src/types/userId.type";
import { OrganizationId } from "@yac/util/src/types/organizationId.type";
import { TeamId } from "@yac/util/src/types/teamId.type";
import { ConversationId } from "@yac/util/src/types/conversationId.type";
import { GroupId } from "@yac/util/src/types/groupId.type";
import { MeetingId } from "@yac/util/src/types/meetingId.type";
import { MakeRequired } from "@yac/util/src/types/makeRequired.type";
import { MessageId } from "@yac/util/src/types/messageId.type";
import { BadRequestError } from "@yac/util/src/errors/badRequest.error";
import { Aws4, Aws4Factory } from "../factories/aws4.factory";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { SearchIndex } from "../enums/searchIndex.enum";
import { Team } from "./team.dynamo.repository";
import { User } from "./user.dynamo.repository";
import { Message } from "./message.dynamo.repository";
import { Organization } from "./organization.dynamo.repository";
import { Group } from "./group.dynamo.repository";
import { Meeting } from "./meeting.dynamo.repository";

@injectable()
export class OpenSearchRepository implements SearchRepositoryInterface {
  private axios: Axios;

  private aws4: Aws4;

  private openSearchDomainEndpoint: string;

  constructor(
  @inject(TYPES.AxiosFactory) axiosFactory: AxiosFactory,
    @inject(TYPES.Aws4Factory) aws4Factory: Aws4Factory,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: TeamSearchRepositoryRepositoryConfig,
  ) {
    this.axios = axiosFactory();
    this.aws4 = aws4Factory();
    this.openSearchDomainEndpoint = config.openSearchDomainEndpoint;
  }

  public async getEntitiesBySearchTerm(params: GetEntitiesBySearchTermInput): Promise<GetEntitiesBySearchTermOutput> {
    try {
      this.loggerService.trace("getEntitiesBySearchTerm called", { params }, this.constructor.name);

      const { searchTerm, entityTypes, entityIds, limit, exclusiveStartKey } = params;

      const queryString = `
        SELECT *
        FROM ${entityTypes ? entityTypes.join(", ") : "*"}
        WHERE ( 
          MATCH_PHRASE(name, '${searchTerm}')
          OR MATCH_PHRASE(username, '${searchTerm}')
          OR MATCH_PHRASE(email, '${searchTerm}')
          OR MATCH_PHRASE(phone, '${searchTerm}')
          OR MATCH_PHRASE(transcript, '${searchTerm}') 
          OR name LIKE '%${searchTerm}%'
          OR username LIKE '%${searchTerm}%'
          OR email LIKE '%${searchTerm}%'
          OR phone LIKE '%${searchTerm}%'
          OR transcript LIKE '%${searchTerm}%'
        )
        ${entityIds ? `AND id IN (${entityIds.join(", ")})` : ""}
      `;

      const { results, lastEvaluatedKey } = await this.query({ queryString, limit, exclusiveStartKey });

      return {
        entities: results,
        lastEvaluatedKey,
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getEntitiesBySearchTerm", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getUsersBySearchTerm(params: GetUsersBySearchTermInput): Promise<GetUsersBySearchTermOutput> {
    try {
      this.loggerService.trace("getUsersBySearchTerm called", { params }, this.constructor.name);

      const { searchTerm, userIds, limit, exclusiveStartKey } = params;

      const queryString = `
        SELECT *
        FROM ${SearchIndex.User}
        WHERE ( 
          MATCH_PHRASE(name, '${searchTerm}')
          OR MATCH_PHRASE(username, '${searchTerm}')
          OR MATCH_PHRASE(email, '${searchTerm}')
          OR MATCH_PHRASE(phone, '${searchTerm}')
          OR name LIKE '%${searchTerm}%'
          OR username LIKE '%${searchTerm}%'
          OR email LIKE '%${searchTerm}%'
          OR phone LIKE '%${searchTerm}%'
        )
        ${userIds ? `AND id IN (${userIds.join(", ")})` : ""}
      `;

      const { results, lastEvaluatedKey } = await this.query({ queryString, limit, exclusiveStartKey });

      return {
        users: results as UserOnlyIdRequired[],
        lastEvaluatedKey,
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersBySearchTerm", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGroupsBySearchTerm(params: GetGroupsBySearchTermInput): Promise<GetGroupsBySearchTermOutput> {
    try {
      this.loggerService.trace("getGroupsBySearchTerm called", { params }, this.constructor.name);

      const { searchTerm, groupIds, organizationId, teamId, limit, exclusiveStartKey } = params;

      const queryString = `
        SELECT *
        FROM ${SearchIndex.Group}
        WHERE (
          MATCH_PHRASE(name, '${searchTerm}')
          OR name LIKE '%${searchTerm}%'
        )
        ${groupIds ? `AND id IN (${groupIds.join(", ")})` : ""}
        ${teamId ? `AND teamId = '${teamId}'` : ""}
        ${organizationId ? `AND organizationId = '${organizationId}' AND teamId IS NULL` : ""}
      `;

      const { results, lastEvaluatedKey } = await this.query({ queryString, limit, exclusiveStartKey });

      return {
        groups: results as GroupOnlyIdRequired[],
        lastEvaluatedKey,
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupsBySearchTerm", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeetingsBySearchTerm(params: GetMeetingsBySearchTermInput): Promise<GetMeetingsBySearchTermOutput> {
    try {
      this.loggerService.trace("getMeetingsBySearchTerm called", { params }, this.constructor.name);

      const { searchTerm, meetingIds, teamId, organizationId, sortByDueAt, limit, exclusiveStartKey } = params;

      const queryString = `
        SELECT *
        FROM ${SearchIndex.Meeting}
        WHERE (
          MATCH_PHRASE(name, '${searchTerm}')
          OR name LIKE '%${searchTerm}%'
        )
        ${meetingIds ? `AND id IN (${meetingIds.join(", ")})` : ""}
        ${teamId ? `AND teamId = '${teamId}'` : ""}
        ${organizationId ? `AND organizationId = '${organizationId}' AND teamId IS NULL` : ""}
        ${sortByDueAt ? "ORDER BY dueAt DESC" : ""}
      `;

      const { results, lastEvaluatedKey } = await this.query({ queryString, limit, exclusiveStartKey });

      return {
        meetings: results as MeetingOnlyIdRequired[],
        lastEvaluatedKey,
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingsBySearchTerm", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getUsersAndGroupsBySearchTerm(params: GetUsersAndGroupsBySearchTermInput): Promise<GetUsersAndGroupsBySearchTermOutput> {
    try {
      this.loggerService.trace("getUsersAndGroupsBySearchTerm called", { params }, this.constructor.name);

      const { searchTerm, userAndGroupIds, limit, exclusiveStartKey } = params;

      const queryString = `
        SELECT *
        FROM ${SearchIndex.User}, ${SearchIndex.Group}
        WHERE ( 
          MATCH_PHRASE(name, '${searchTerm}')
          OR MATCH_PHRASE(username, '${searchTerm}')
          OR MATCH_PHRASE(email, '${searchTerm}')
          OR MATCH_PHRASE(phone, '${searchTerm}')
          OR MATCH_PHRASE(name, '${searchTerm}')
          OR name LIKE '%${searchTerm}%'
          OR username LIKE '%${searchTerm}%'
          OR email LIKE '%${searchTerm}%'
          OR phone LIKE '%${searchTerm}%'
          OR name LIKE '%${searchTerm}%'
        )
        ${userAndGroupIds ? `AND id IN (${userAndGroupIds.join(", ")})` : ""}
      `;

      const { results, lastEvaluatedKey } = await this.query({ queryString, limit, exclusiveStartKey });

      return {
        usersAndGroups: results as (UserOnlyIdRequired | GroupOnlyIdRequired)[],
        lastEvaluatedKey,
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersAndGroupsBySearchTerm", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getUsersGroupsAndMeetingsBySearchTerm(params: GetUsersGroupsAndMeetingsBySearchTermInput): Promise<GetUsersGroupsAndMeetingsBySearchTermOutput> {
    try {
      this.loggerService.trace("getUsersGroupsAndMeetingsBySearchTerm called", { params }, this.constructor.name);

      const { searchTerm, entityIds, limit, exclusiveStartKey } = params;

      const queryString = `
        SELECT *
        FROM ${SearchIndex.User}, ${SearchIndex.Group}, ${SearchIndex.Meeting}
        WHERE ( 
          MATCH_PHRASE(name, '${searchTerm}')
          OR MATCH_PHRASE(username, '${searchTerm}')
          OR MATCH_PHRASE(email, '${searchTerm}')
          OR MATCH_PHRASE(phone, '${searchTerm}')
          OR MATCH_PHRASE(name, '${searchTerm}')
          OR name LIKE '%${searchTerm}%'
          OR username LIKE '%${searchTerm}%'
          OR email LIKE '%${searchTerm}%'
          OR phone LIKE '%${searchTerm}%'
          OR name LIKE '%${searchTerm}%'
        )
        ${entityIds ? `AND id IN (${entityIds.join(", ")})` : ""}
      `;

      const { results, lastEvaluatedKey } = await this.query({ queryString, limit, exclusiveStartKey });

      return {
        usersGroupsAndMeetings: results as (UserOnlyIdRequired | GroupOnlyIdRequired | MeetingOnlyIdRequired)[],
        lastEvaluatedKey,
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersGroupsAndMeetingsBySearchTerm", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMessagesBySearchTerm(params: GetMessagesBySearchTermInput): Promise<GetMessagesBySearchTermOutput> {
    try {
      this.loggerService.trace("getMessagesBySearchTerm called", { params }, this.constructor.name);

      const { searchTerm, conversationIds, limit, exclusiveStartKey } = params;

      const queryString = `
        SELECT *
        FROM ${SearchIndex.Message}
        WHERE (
          MATCH_PHRASE(transcript, '${searchTerm}') 
          OR transcript LIKE '%${searchTerm}%'
        )
        ${conversationIds ? `AND conversationId IN (${conversationIds.join(", ")})` : ""}
      `;

      const { results, lastEvaluatedKey } = await this.query({ queryString, limit, exclusiveStartKey });

      return {
        messages: results as MessageOnlyIdRequired[],
        lastEvaluatedKey,
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMessagesBySearchTerm", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getTeamsBySearchTerm(params: GetTeamsBySearchTermInput): Promise<GetTeamsBySearchTermOutput> {
    try {
      this.loggerService.trace("getTeamsBySearchTerm called", { params }, this.constructor.name);

      const { searchTerm, teamIds, limit, exclusiveStartKey } = params;

      const queryString = `
        SELECT *
        FROM ${SearchIndex.Team}
        WHERE (
          MATCH_PHRASE(name, '${searchTerm}')
          OR name LIKE '%${searchTerm}%'
        )
        ${teamIds ? `AND id IN (${teamIds.join(", ")})` : ""}
      `;

      const { results, lastEvaluatedKey } = await this.query({ queryString, limit, exclusiveStartKey });

      return {
        teams: results as TeamOnlyIdRequired[],
        lastEvaluatedKey,
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamsBySearchTerm", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOrganizationsBySearchTerm(params: GetOrganizationsBySearchTermInput): Promise<GetOrganizationsBySearchTermOutput> {
    try {
      this.loggerService.trace("getOrganizationsBySearchTerm called", { params }, this.constructor.name);

      const { searchTerm, organizationIds, limit, exclusiveStartKey } = params;

      const queryString = `
        SELECT *
        FROM ${SearchIndex.Organization}
        WHERE (
          MATCH_PHRASE(name, '${searchTerm}')
          OR name LIKE '%${searchTerm}%'
        )
        ${organizationIds ? `AND id IN (${organizationIds.join(", ")})` : ""}
      `;

      const { results, lastEvaluatedKey } = await this.query({ queryString, limit, exclusiveStartKey });

      return {
        organizations: results as OrganizationOnlyIdRequired[],
        lastEvaluatedKey,
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrganizationsBySearchTerm", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async indexDocument<T extends SearchIndex>(params: IndexDocumentInput<T>): Promise<IndexDocumentOutput> {
    try {
      this.loggerService.trace("indexDocument called", { params }, this.constructor.name);

      const { index, document } = params;

      const path = `/${index}/${index}/${document.id}`;

      await this.axios(this.aws4.sign({
        host: this.openSearchDomainEndpoint,
        method: "POST",
        url: `https://${this.openSearchDomainEndpoint}${path}`,
        data: document,
        body: JSON.stringify(document),
        path,
        headers: { "Content-Type": "application/json" },
      }));
    } catch (error: unknown) {
      this.loggerService.error("Error in indexDocument", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deindexDocument<T extends SearchIndex>(params: DeindexDocumentInput<T>): Promise<DeindexDocumentOutput> {
    try {
      this.loggerService.trace("deindexDocument called", { params }, this.constructor.name);

      const { index, id } = params;

      const path = `/${index}/${index}/${id}`;

      await this.axios(this.aws4.sign({
        host: this.openSearchDomainEndpoint,
        method: "DELETE",
        url: `https://${this.openSearchDomainEndpoint}${path}`,
        path,
      }));
    } catch (error: unknown) {
      this.loggerService.error("Error in deindexDocument", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private async query(params: QueryInput): Promise<QueryOutput> {
    try {
      this.loggerService.trace("query called", { params }, this.constructor.name);

      const { queryString, limit, exclusiveStartKey } = params;

      let offset: number | undefined;

      if (exclusiveStartKey) {
        ({ key: { offset } } = this.decodeSearchKey({ key: exclusiveStartKey }));
      }

      const queryWithLimitAndOffset = `
        ${queryString}
        ${limit ? `LIMIT ${limit}` : ""}
        ${offset ? `OFFSET ${offset}` : ""}
      `;

      const data = { query: queryWithLimitAndOffset };

      const path = "/_plugins/_sql";

      const queryResponse = await this.axios(this.aws4.sign({
        host: this.openSearchDomainEndpoint,
        method: "POST",
        url: `https://${this.openSearchDomainEndpoint}${path}`,
        data,
        body: JSON.stringify(data),
        path,
        headers: { "Content-Type": "application/json" },
      }));

      const { schema, datarows, total, size } = queryResponse.data as {
        schema: { name: keyof EntityOnlyIdRequired; }[];
        datarows: unknown[][];
        total: number;
        size: number;
      };

      const results = datarows.map((datarow) => {
        const entity: Partial<EntityOnlyIdRequired> = {};
        datarow.forEach((val, i) => {
          const propName = schema[i].name;

          if (val !== null) {
            if (propName === "id") {
              entity[propName] = val as EntityOnlyIdRequired["id"];
            } else {
              entity[propName] = val as keyof Omit<EntityOnlyIdRequired, "id">;
            }
          }
        });

        return entity as EntityOnlyIdRequired;
      });

      let lastEvaluatedKey: string | undefined;

      const totalViewed = size + (offset || 0);

      if (totalViewed < total) {
        ({ key: lastEvaluatedKey } = this.encodeSearchKey({ key: { offset: totalViewed } }));
      }

      return { results, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in query", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private encodeSearchKey(params: EncodeSearchKeyInput): EncodeSearchKeyOutput {
    try {
      this.loggerService.trace("encodeSearchKey called", { params }, this.constructor.name);

      const { key } = params;

      const encodedKey = Buffer.from(JSON.stringify(key)).toString("base64");

      return { key: encodedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in encodeSearchKey", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private decodeSearchKey(params: DecodeSearchKeyInput): DecodeSearchKeyOutput {
    try {
      this.loggerService.trace("decodeSearchKey called", { params }, this.constructor.name);

      const { key } = params;

      let decodedKey: SearchKey | unknown;

      try {
        decodedKey = JSON.parse(Buffer.from(key, "base64").toString()) as unknown;
      } catch (error) {
        throw new BadRequestError("Malformed start key");
      }

      if (!this.isSearchKey(decodedKey)) {
        throw new BadRequestError("Malformed start key");
      }

      return { key: decodedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in decodeSearchKey", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private isSearchKey(key: unknown): key is SearchKey {
    try {
      this.loggerService.trace("isDyanmoKey called", { key }, this.constructor.name);

      if (typeof key !== "object" || key === null) {
        return false;
      }

      return "offset" in key;
    } catch (error: unknown) {
      this.loggerService.error("Error in isDyanmoKey", { error, key }, this.constructor.name);

      throw error;
    }
  }
}

export interface SearchRepositoryInterface {
  getEntitiesBySearchTerm(params: GetEntitiesBySearchTermInput): Promise<GetEntitiesBySearchTermOutput>;
  getUsersBySearchTerm(params: GetUsersBySearchTermInput): Promise<GetUsersBySearchTermOutput>;
  getGroupsBySearchTerm(params: GetGroupsBySearchTermInput): Promise<GetGroupsBySearchTermOutput>;
  getMeetingsBySearchTerm(params: GetMeetingsBySearchTermInput): Promise<GetMeetingsBySearchTermOutput>;
  getUsersAndGroupsBySearchTerm(params: GetUsersAndGroupsBySearchTermInput): Promise<GetUsersAndGroupsBySearchTermOutput>;
  getUsersGroupsAndMeetingsBySearchTerm(params: GetUsersGroupsAndMeetingsBySearchTermInput): Promise<GetUsersGroupsAndMeetingsBySearchTermOutput>;
  getMessagesBySearchTerm(params: GetMessagesBySearchTermInput): Promise<GetMessagesBySearchTermOutput>;
  getTeamsBySearchTerm(params: GetTeamsBySearchTermInput): Promise<GetTeamsBySearchTermOutput>;
  getOrganizationsBySearchTerm(params: GetOrganizationsBySearchTermInput): Promise<GetOrganizationsBySearchTermOutput>;
  indexDocument<T extends SearchIndex>(params: IndexDocumentInput<T>): Promise<IndexDocumentOutput>;
  deindexDocument<T extends SearchIndex>(params: DeindexDocumentInput<T>): Promise<DeindexDocumentOutput>;
}

type TeamSearchRepositoryRepositoryConfig = Pick<EnvConfigInterface, "openSearchDomainEndpoint">;

export type EntityId = UserId | OrganizationId | TeamId | ConversationId;

export interface GetEntitiesBySearchTermInput {
  searchTerm: string;
  entityTypes?: SearchIndex[];
  entityIds?: EntityId[];
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetEntitiesBySearchTermOutput {
  entities: EntityOnlyIdRequired[];
  lastEvaluatedKey?: string;
}

export interface GetUsersBySearchTermInput {
  searchTerm: string;
  userIds?: UserId[];
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetUsersBySearchTermOutput {
  users: UserOnlyIdRequired[];
  lastEvaluatedKey?: string;
}

export interface GetGroupsBySearchTermInput {
  searchTerm: string;
  groupIds?: GroupId[];
  teamId?: TeamId;
  organizationId?: OrganizationId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetGroupsBySearchTermOutput {
  groups: GroupOnlyIdRequired[];
  lastEvaluatedKey?: string;
}

export interface GetMeetingsBySearchTermInput {
  searchTerm: string;
  meetingIds?: MeetingId[];
  teamId?: TeamId;
  organizationId?: OrganizationId;
  sortByDueAt?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMeetingsBySearchTermOutput {
  meetings: MeetingOnlyIdRequired[];
  lastEvaluatedKey?: string;
}

export interface GetUsersAndGroupsBySearchTermInput {
  searchTerm: string;
  userAndGroupIds?: (UserId | GroupId)[];
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetUsersAndGroupsBySearchTermOutput {
  usersAndGroups: (UserOnlyIdRequired | GroupOnlyIdRequired)[];
  lastEvaluatedKey?: string;
}

export interface GetUsersGroupsAndMeetingsBySearchTermInput {
  searchTerm: string;
  entityIds?: UserGroupOrMeetingId[];
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetUsersGroupsAndMeetingsBySearchTermOutput {
  usersGroupsAndMeetings: UserGroupOrMeetingOnlyIdRequired[];
  lastEvaluatedKey?: string;
}

export interface GetMessagesBySearchTermInput {
  searchTerm: string;
  conversationIds?: ConversationId[];
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMessagesBySearchTermOutput {
  messages: MessageOnlyIdRequired[];
  lastEvaluatedKey?: string;
}

export interface GetTeamsBySearchTermInput {
  searchTerm: string;
  teamIds?: TeamId[];
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetTeamsBySearchTermOutput {
  teams: TeamOnlyIdRequired[];
  lastEvaluatedKey?: string;
}

export interface GetOrganizationsBySearchTermInput {
  searchTerm: string;
  organizationIds?: OrganizationId[];
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetOrganizationsBySearchTermOutput {
  organizations: OrganizationOnlyIdRequired[];
  lastEvaluatedKey?: string;
}

export interface IndexDocumentInput<T extends SearchIndex> {
  index: T;
  document: IndexToDocument<T>;
}

export type IndexDocumentOutput = void;

export interface DeindexDocumentInput<T extends SearchIndex> {
  index: T;
  id: IndexToId<T>;
}

export type DeindexDocumentOutput = void;

export interface QueryInput {
  queryString: string;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface QueryOutput {
  results: EntityOnlyIdRequired[];
  lastEvaluatedKey?: string;
}

export type UserGroupOrMeetingId = UserId | GroupId | MeetingId;
export type UserGroupOrMeetingOnlyIdRequired = UserOnlyIdRequired | GroupOnlyIdRequired | MeetingOnlyIdRequired;

interface EncodeSearchKeyInput {
  key: SearchKey;
}

interface EncodeSearchKeyOutput {
  key: string;
}

interface DecodeSearchKeyInput {
  key: string;
}

interface DecodeSearchKeyOutput {
  key: SearchKey;
}

type UserOnlyIdRequired = MakeRequired<Partial<User>, "id">;
type GroupOnlyIdRequired = MakeRequired<Partial<Group>, "id">;
type MeetingOnlyIdRequired = MakeRequired<Partial<Meeting>, "id">;
type TeamOnlyIdRequired = MakeRequired<Partial<Team>, "id">;
type MessageOnlyIdRequired = MakeRequired<Partial<Message>, "id">;
type OrganizationOnlyIdRequired = MakeRequired<Partial<Organization>, "id">;

type EntityOnlyIdRequired = UserOnlyIdRequired | OrganizationOnlyIdRequired | GroupOnlyIdRequired | MeetingOnlyIdRequired | TeamOnlyIdRequired | MessageOnlyIdRequired;

interface SearchKey {
  offset: number;
}

type IndexToDocument<T extends SearchIndex> =
  T extends SearchIndex.User ? User :
    T extends SearchIndex.Group ? Group :
      T extends SearchIndex.Meeting ? Meeting :
        T extends SearchIndex.Team ? Team :
          T extends SearchIndex.Organization ? Organization : Message;

type IndexToId<T extends SearchIndex> =
  T extends SearchIndex.User ? UserId :
    T extends SearchIndex.Group ? GroupId :
      T extends SearchIndex.Meeting ? MeetingId :
        T extends SearchIndex.Team ? TeamId :
          T extends SearchIndex.Organization ? OrganizationId : MessageId;
