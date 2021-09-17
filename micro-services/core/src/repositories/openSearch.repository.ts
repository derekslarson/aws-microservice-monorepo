import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface, AxiosFactory, Axios, RawEntity, CleansedEntity, BadRequestError } from "@yac/util";
import { Aws4, Aws4Factory } from "../factories/aws4.factory";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { TeamId } from "../types/teamId.type";
import { SearchIndex } from "../enums/searchIndex.enum";
import { RawTeam, Team } from "./team.dynamo.repository";
import { RawUser, User } from "./user.dynamo.repository";
import { GroupConversation, MeetingConversation, RawConversation } from "./conversation.dynamo.repository";
import { Message, RawMessage } from "./message.dynamo.repository";
import { UserId } from "../types/userId.type";
import { GroupId } from "../types/groupId.type";
import { MeetingId } from "../types/meetingId.type";
import { MessageId } from "../types/messageId.type";
import { ConversationId } from "../types/conversationId.type";

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

  public async getUsersBySearchTerm(params: GetUsersBySearchTermInput): Promise<GetUsersBySearchTermOutput> {
    try {
      this.loggerService.trace("getUsersBySearchTerm called", { params }, this.constructor.name);

      const { searchTerm, userIds, limit, exclusiveStartKey } = params;

      const queryString = `
        SELECT *
        FROM ${SearchIndex.User}
        WHERE ( 
          realName LIKE "%${searchTerm}%"
          OR username LIKE "%${searchTerm}%"
          OR email LIKE "%${searchTerm}%"
          OR phone LIKE "%${searchTerm}%"
        )
        ${userIds ? `AND id IN (${userIds.join(", ")})` : ""}
      `;

      const { results, lastEvaluatedKey } = await this.query({ queryString, limit, exclusiveStartKey });

      return {
        users: results as User[],
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

      const { searchTerm, groupIds, limit, exclusiveStartKey } = params;

      const queryString = `
        SELECT *
        FROM ${SearchIndex.Group}
        WHERE name LIKE "%${searchTerm}%"
        ${groupIds ? `AND id IN (${groupIds.join(", ")})` : ""}
      `;

      const { results, lastEvaluatedKey } = await this.query({ queryString, limit, exclusiveStartKey });

      return {
        groups: results as GroupConversation[],
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

      const { searchTerm, meetingIds, limit, exclusiveStartKey } = params;

      const queryString = `
        SELECT *
        FROM ${SearchIndex.Meeting}
        WHERE name LIKE "%${searchTerm}%"
        ${meetingIds ? `AND id IN (${meetingIds.join(", ")})` : ""}
      `;

      const { results, lastEvaluatedKey } = await this.query({ queryString, limit, exclusiveStartKey });

      return {
        meetings: results as MeetingConversation[],
        lastEvaluatedKey,
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingsBySearchTerm", { error, params }, this.constructor.name);

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
          realName LIKE "%${searchTerm}%"
          OR username LIKE "%${searchTerm}%"
          OR email LIKE "%${searchTerm}%"
          OR phone LIKE "%${searchTerm}%"
          OR name LIKE "%${searchTerm}%"
        )
        ${entityIds ? `AND id IN (${entityIds.join(", ")})` : ""}
      `;

      const { results, lastEvaluatedKey } = await this.query({ queryString, limit, exclusiveStartKey });

      return {
        usersGroupsAndMeetings: results as UserGroupOrMeeting[],
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
        WHERE transcript LIKE "%${searchTerm}%"
        ${conversationIds ? `AND conversationId IN (${conversationIds.join(", ")})` : ""}
      `;

      const { results, lastEvaluatedKey } = await this.query({ queryString, limit, exclusiveStartKey });

      return {
        messages: results as Message[],
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
        WHERE transcript LIKE "%${searchTerm}%"
        ${teamIds ? `AND id IN (${teamIds.join(", ")})` : ""}
      `;

      const { results, lastEvaluatedKey } = await this.query({ queryString, limit, exclusiveStartKey });

      return {
        teams: results as Team[],
        lastEvaluatedKey,
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamsBySearchTerm", { error, params }, this.constructor.name);

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
        schema: { name: keyof RawEntity<QueryResult>; }[];
        datarows: unknown[][];
        total: number;
        size: number;
      };

      const results = datarows.map((datarow) => {
        const rawEntity = datarow.reduce((acc: Partial<RawEntity<QueryResult>>, val, i) => {
          const propName = schema[i].name;

          if (val !== null) {
            /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
            acc[propName] = val as any;
            /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
          }

          return acc;
        }, {}) as RawEntity<QueryResult>;

        return this.cleanse(rawEntity);
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

  private cleanse<T>(item: RawEntity<T>): CleansedEntity<T> {
    try {
      this.loggerService.trace("cleanse called", { item }, this.constructor.name);

      const { entityType, pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, gsi3pk, gsi3sk, ...rest } = item;

      return rest as unknown as CleansedEntity<T>;
    } catch (error: unknown) {
      this.loggerService.error("Error in cleanse", { error, item }, this.constructor.name);

      throw error;
    }
  }
}

export interface SearchRepositoryInterface {
  getUsersBySearchTerm(params: GetUsersBySearchTermInput): Promise<GetUsersBySearchTermOutput>;
  getGroupsBySearchTerm(params: GetGroupsBySearchTermInput): Promise<GetGroupsBySearchTermOutput>;
  getMeetingsBySearchTerm(params: GetMeetingsBySearchTermInput): Promise<GetMeetingsBySearchTermOutput>;
  getUsersGroupsAndMeetingsBySearchTerm(params: GetUsersGroupsAndMeetingsBySearchTermInput): Promise<GetUsersGroupsAndMeetingsBySearchTermOutput>;
  getMessagesBySearchTerm(params: GetMessagesBySearchTermInput): Promise<GetMessagesBySearchTermOutput>;
  getTeamsBySearchTerm(params: GetTeamsBySearchTermInput): Promise<GetTeamsBySearchTermOutput>;
  indexDocument<T extends SearchIndex>(params: IndexDocumentInput<T>): Promise<IndexDocumentOutput>;
  deindexDocument<T extends SearchIndex>(params: DeindexDocumentInput<T>): Promise<DeindexDocumentOutput>;
}

type TeamSearchRepositoryRepositoryConfig = Pick<EnvConfigInterface, "openSearchDomainEndpoint">;

export interface GetUsersBySearchTermInput {
  searchTerm: string;
  userIds?: UserId[];
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetUsersBySearchTermOutput {
  users: User[];
  lastEvaluatedKey?: string;
}

export interface GetGroupsBySearchTermInput {
  searchTerm: string;
  groupIds?: GroupId[];
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetGroupsBySearchTermOutput {
  groups: GroupConversation[];
  lastEvaluatedKey?: string;
}

export interface GetMeetingsBySearchTermInput {
  searchTerm: string;
  meetingIds?: MeetingId[];
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMeetingsBySearchTermOutput {
  meetings: MeetingConversation[];
  lastEvaluatedKey?: string;
}

export interface GetUsersGroupsAndMeetingsBySearchTermInput {
  searchTerm: string;
  entityIds?: UserGroupOrMeetingId[];
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetUsersGroupsAndMeetingsBySearchTermOutput {
  usersGroupsAndMeetings: UserGroupOrMeeting[];
  lastEvaluatedKey?: string;
}

export interface GetMessagesBySearchTermInput {
  searchTerm: string;
  conversationIds?: ConversationId[];
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMessagesBySearchTermOutput {
  messages: Message[];
  lastEvaluatedKey?: string;
}

export interface GetTeamsBySearchTermInput {
  searchTerm: string;
  teamIds?: TeamId[];
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetTeamsBySearchTermOutput {
  teams: Team[];
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
  results: QueryResult[];
  lastEvaluatedKey?: string;
}

export type UserGroupOrMeetingId = UserId | GroupId | MeetingId;
export type UserGroupOrMeeting = User | GroupConversation | MeetingConversation;

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

type QueryResult = User | GroupConversation | MeetingConversation | Team | Message;

interface SearchKey {
  offset: number;
}

type IndexToDocument<T extends SearchIndex> =
  T extends SearchIndex.User ? RawUser :
    T extends SearchIndex.Group ? RawConversation<GroupConversation> :
      T extends SearchIndex.Meeting ? RawConversation<MeetingConversation> :
        T extends SearchIndex.Team ? RawTeam : RawMessage;

type IndexToId<T extends SearchIndex> =
  T extends SearchIndex.User ? UserId :
    T extends SearchIndex.Group ? GroupId :
      T extends SearchIndex.Meeting ? MeetingId :
        T extends SearchIndex.Team ? TeamId : MessageId;
