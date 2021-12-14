/* eslint-disable no-nested-ternary */
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, ConversationId, DocumentClientFactory, GroupId, LoggerServiceInterface, MeetingId, OneOnOneId, OrganizationId, Role, TeamId, UserId } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { MembershipType } from "../enums/membershipType.enum";
import { MembershipFetchType } from "../enums/membershipFetchType.enum";

@injectable()
export class MembershipDynamoRepository extends BaseDynamoRepositoryV2<Membership> implements MembershipRepositoryInterface {
  private gsiOneIndexName: string;

  private gsiTwoIndexName: string;

  private gsiThreeIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: MembershipRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);

    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
    this.gsiTwoIndexName = envConfig.globalSecondaryIndexNames.two;
    this.gsiThreeIndexName = envConfig.globalSecondaryIndexNames.three;
  }

  public async createMembership(params: CreateMembershipInput): Promise<CreateMembershipOutput> {
    try {
      this.loggerService.trace("createMembership called", { params }, this.constructor.name);

      const { membership } = params;

      const membershipEntity: RawMembership = {
        entityType: EntityType.Membership,
        pk: membership.userId,
        sk: `${KeyPrefix.Membership}${membership.entityId}`,
        gsi1pk: membership.entityId,
        // This gets updated to userName in a processor service so that the service layer doesn't need to handle it
        gsi1sk: `${KeyPrefix.Membership}${KeyPrefix.User}${KeyPrefix.Name}${membership.userName || membership.userId}`,
        gsi2pk: membership.userId,
        gsi2sk: `${KeyPrefix.Membership}${membership.type}_${KeyPrefix.Active}${membership.activeAt}`,
        gsi3pk: membership.userId,
        ...membership,
      };

      if (membership.type === MembershipType.Meeting) {
        membershipEntity.gsi3sk = `${KeyPrefix.Membership}${membership.type}_${KeyPrefix.Due}${membership.dueAt}`;
      } else if (membership.type === MembershipType.OneOnOne || membership.type === MembershipType.Group) {
        membershipEntity.gsi3sk = `${KeyPrefix.Membership}${MembershipFetchType.OneOnOneAndGroup}_${KeyPrefix.Active}${membership.activeAt}`;
      }

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk)",
        Item: membershipEntity,
      }).promise();

      return { membership };
    } catch (error: unknown) {
      this.loggerService.error("Error in createMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMembership(params: GetMembershipInput): Promise<GetMembershipOutput> {
    try {
      this.loggerService.trace("getMembership called", { params }, this.constructor.name);

      const { entityId, userId } = params;

      const membership = await this.get({ Key: { pk: userId, sk: `${KeyPrefix.Membership}${entityId}` } }, "Membership");

      return { membership };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateMembership(params: UpdateMembershipInput): Promise<UpdateMembershipOutput> {
    try {
      this.loggerService.trace("updateMembership called", { params }, this.constructor.name);

      const { userId, entityId, updates } = params;

      const rawUpdates: RawMembershipUpdates = { ...updates };

      if (updates.userName) {
        rawUpdates.gsi1sk = `${KeyPrefix.Membership}${KeyPrefix.User}${KeyPrefix.Name}${updates.userName}`;
      }

      if (updates.activeAt) {
        const { membershipType } = this.getMembershipTypeFromEntityId({ entityId });

        rawUpdates.gsi2sk = `${KeyPrefix.Membership}${membershipType}_${KeyPrefix.Active}${updates.activeAt}`;

        if (membershipType === MembershipType.OneOnOne || membershipType === MembershipType.Group) {
          rawUpdates.gsi3sk = `${KeyPrefix.Membership}${MembershipFetchType.OneOnOneAndGroup}_${KeyPrefix.Active}${updates.activeAt}`;
        }
      }

      if (this.isUpdateMeetingMembershipInput(params) && params.updates.dueAt) {
        rawUpdates.gsi3sk = `${KeyPrefix.Membership}${MembershipType.Meeting}_${KeyPrefix.Due}${params.updates.dueAt}`;
      }

      const membership = await this.partialUpdate(userId, `${KeyPrefix.Membership}${entityId}`, rawUpdates);

      return { membership };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async incrementUnreadMessages(params: IncrementUnreadMessagesInput): Promise<IncrementUnreadMessagesOutput> {
    try {
      this.loggerService.trace("incrementUnreadMessages called", { params }, this.constructor.name);

      const { entityId, userId } = params;

      const now = new Date().toISOString();

      const { membershipType } = this.getMembershipTypeFromEntityId({ entityId });

      const isGroupOrOneOnOne = membershipType === MembershipType.OneOnOne || membershipType === MembershipType.Group;

      const membership = await this.update({
        Key: { pk: userId, sk: `${KeyPrefix.Membership}${entityId}` },
        UpdateExpression: `ADD #unreadMessages :one SET #activeAt = :now, #gsi2sk = :gsi2sk${isGroupOrOneOnOne ? ", #gsi3sk = :gsi3sk" : ""}`,
        ExpressionAttributeNames: {
          "#unreadMessages": "unreadMessages",
          "#activeAt": "activeAt",
          "#gsi2sk": "gsi2sk",
          ...(isGroupOrOneOnOne && { "#gsi3sk": "gsi3sk" }),
        },
        ExpressionAttributeValues: {
          ":one": 1,
          ":now": now,
          ":gsi2sk": `${KeyPrefix.Membership}${membershipType}_${KeyPrefix.Active}${now}`,
          ...(isGroupOrOneOnOne && { ":gsi3sk": `${KeyPrefix.Membership}${MembershipFetchType.OneOnOneAndGroup}_${KeyPrefix.Active}${now}` }),
        },
      });

      return { membership };
    } catch (error: unknown) {
      this.loggerService.error("Error in incrementUnreadMessages", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async resetUnreadMessages(params: ResetUnreadMessagesInput): Promise<ResetUnreadMessagesOutput> {
    try {
      this.loggerService.trace("resetUnreadMessages called", { params }, this.constructor.name);

      const { entityId, userId } = params;

      const membership = await this.update({
        Key: { pk: userId, sk: `${KeyPrefix.Membership}${entityId}` },
        UpdateExpression: "SET #unreadMessages = :zero, #userActiveAt = :now",
        ExpressionAttributeNames: {
          "#unreadMessages": "unreadMessages",
          "#userActiveAt": "userActiveAt",
        },
        ExpressionAttributeValues: {
          ":zero": 0,
          ":now": new Date().toISOString(),
        },
      });

      return { membership };
    } catch (error: unknown) {
      this.loggerService.error("Error in resetUnreadMessages", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteMembership(params: DeleteMembershipInput): Promise<DeleteMembershipOutput> {
    try {
      this.loggerService.trace("deleteMembership called", { params }, this.constructor.name);

      const { entityId, userId } = params;
      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: userId, sk: `${KeyPrefix.Membership}${entityId}` },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMembershipsByEntityId(params: GetMembershipsByEntityIdInput): Promise<GetMembershipsByEntityIdOutput> {
    try {
      this.loggerService.trace("getMembershipsByEntityId called", { params }, this.constructor.name);

      const { entityId, exclusiveStartKey, limit } = params;

      const { Items: memberships, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        IndexName: this.gsiOneIndexName,
        KeyConditionExpression: "#gsi1pk = :entityId AND begins_with(#gsi1sk, :userNamePrefix)",
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":entityId": entityId,
          ":userNamePrefix": `${KeyPrefix.Membership}${KeyPrefix.User}${KeyPrefix.Name}`,
        },
      });

      return {
        memberships,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMembershipsByEntityId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMembershipsByUserId<T extends MembershipFetchType>(params: GetMembershipsByUserIdInput<T>): Promise<GetMembershipsByUserIdOutput<T>> {
    try {
      this.loggerService.trace("getMembershipsByUserId called", { params }, this.constructor.name);

      const { userId, type, sortByDueAt, exclusiveStartKey, limit } = params;

      const { Items: memberships, LastEvaluatedKey } = await this.query<Membership<T>>({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        IndexName: sortByDueAt || type === MembershipFetchType.OneOnOneAndGroup ? this.gsiThreeIndexName : type ? this.gsiTwoIndexName : undefined,
        KeyConditionExpression: "#pk = :userId AND begins_with(#sk, :skPrefix)",
        ExpressionAttributeNames: {
          "#pk": sortByDueAt || type === MembershipFetchType.OneOnOneAndGroup ? "gsi3pk" : type ? "gsi2pk" : "pk",
          "#sk": sortByDueAt || type === MembershipFetchType.OneOnOneAndGroup ? "gsi3sk" : type ? "gsi2sk" : "pk",
        },
        ExpressionAttributeValues: {
          ":userId": userId,
          ":skPrefix": type ? `${KeyPrefix.Membership}${type}_${sortByDueAt ? KeyPrefix.Due : KeyPrefix.Active}` : KeyPrefix.Membership,
        },
      });

      return {
        memberships,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMembershipsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private isUpdateMeetingMembershipInput(params: UpdateMembershipInput): params is UpdateMeetingMembershipInput {
    try {
      this.loggerService.trace("isUpdateMeetingMembershipInput called", { params }, this.constructor.name);

      return params.entityId.startsWith(KeyPrefix.Meeting);
    } catch (error: unknown) {
      this.loggerService.error("Error in isUpdateMeetingMembershipInput", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private getMembershipTypeFromEntityId(params: GetMembershipTypeFromEntityIdInput): GetMembershipTypeFromEntityIdOutput {
    try {
      this.loggerService.trace("getMembershipTypeFromEntityId called", { params }, this.constructor.name);

      const { entityId } = params;

      if (entityId.startsWith(KeyPrefix.Organization)) {
        return { membershipType: MembershipType.Organization };
      }

      if (entityId.startsWith(KeyPrefix.Team)) {
        return { membershipType: MembershipType.Team };
      }

      if (entityId.startsWith(KeyPrefix.Group)) {
        return { membershipType: MembershipType.Group };
      }

      if (entityId.startsWith(KeyPrefix.Meeting)) {
        return { membershipType: MembershipType.Meeting };
      }

      return { membershipType: MembershipType.OneOnOne };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMembershipTypeFromEntityId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface MembershipRepositoryInterface {
  createMembership(params: CreateMembershipInput): Promise<CreateMembershipOutput>;
  getMembership(params: GetMembershipInput): Promise<GetMembershipOutput>;
  updateMembership(params: UpdateMembershipInput): Promise<UpdateMembershipOutput>;
  incrementUnreadMessages(params: IncrementUnreadMessagesInput): Promise<IncrementUnreadMessagesOutput>;
  resetUnreadMessages(params: ResetUnreadMessagesInput): Promise<ResetUnreadMessagesOutput>;
  deleteMembership(params: DeleteMembershipInput): Promise<DeleteMembershipOutput>;
  getMembershipsByEntityId(params: GetMembershipsByEntityIdInput): Promise<GetMembershipsByEntityIdOutput>;
  getMembershipsByUserId<T extends MembershipFetchType>(params: GetMembershipsByUserIdInput<T>): Promise<GetMembershipsByUserIdOutput<T>>;
}

type MembershipRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export type EntityId = OrganizationId | TeamId | ConversationId;

export type Membership<T extends MembershipFetchType = MembershipFetchType> =
  T extends MembershipFetchType.Organization ? OrganizationMembership :
    T extends MembershipFetchType.Team ? TeamMembership :
      T extends MembershipFetchType.Group ? GroupMembership :
        T extends MembershipFetchType.Meeting ? MeetingMembership :
          T extends MembershipFetchType.OneOnOne ? OneOnOneMembership :
            T extends MembershipFetchType.OneOnOneAndGroup ? OneOnOneMembership | GroupMembership :
              OrganizationMembership | TeamMembership | GroupMembership | MeetingMembership | OneOnOneMembership;

// For fetching users by entityId, sorted by name
type SortByUserName = `${KeyPrefix.Membership}${KeyPrefix.User}${KeyPrefix.Name}${string}`;

// For fetching any membership type (one type per request) by userId, sorted by activeAt
type SortByTypeAndActiveAt = `${KeyPrefix.Membership}${MembershipType}_${KeyPrefix.Active}${string}`;

// For fetching meetings by userId, sorted by dueAt
type SortByDueAt = `${KeyPrefix.Membership}${MembershipType.Meeting}_${KeyPrefix.Due}${string}`;

// For fetching one-on-ones and groups (combined) by userId, sorted by activeAt
type SortByActiveAt = `${KeyPrefix.Membership}${MembershipFetchType.OneOnOneAndGroup}_${KeyPrefix.Active}${string}`;

type Sk = `${KeyPrefix.Membership}${EntityId}`;
type Gsi1Sk = SortByUserName;
type Gsi2Sk = SortByTypeAndActiveAt;
type Gsi3Sk = SortByActiveAt | SortByDueAt;

export type RawMembership = Membership & {
  entityType: EntityType.Membership,
  pk: UserId;
  sk: Sk;
  gsi1pk: EntityId;
  gsi1sk: Gsi1Sk;
  gsi2pk: UserId;
  gsi2sk: Gsi2Sk;
  gsi3pk: UserId;
  gsi3sk?: Gsi3Sk;
};

export interface CreateMembershipInput {
  membership: Membership;
}

export interface CreateMembershipOutput {
  membership: Membership;
}

export interface GetMembershipInput {
  entityId: EntityId;
  userId: UserId;
}

export interface GetMembershipOutput {
  membership: Membership;
}

export type MembershipUpdates = NormalMembershipUpdates | MeetingMembershipUpdates;

export type UpdateMembershipInput = UpdateNormalMembershipInput | UpdateMeetingMembershipInput;

export interface UpdateMembershipOutput {
  membership: Membership;
}

export interface IncrementUnreadMessagesInput {
  entityId: ConversationId;
  userId: UserId;
}

export interface IncrementUnreadMessagesOutput {
  membership: Membership;
}

export interface ResetUnreadMessagesInput {
  entityId: ConversationId;
  userId: UserId;
}

export interface ResetUnreadMessagesOutput {
  membership: Membership;
}

export interface DeleteMembershipInput {
  entityId: EntityId;
  userId: UserId;
}

export type DeleteMembershipOutput = void;

export interface GetMembershipsByEntityIdInput {
  entityId: EntityId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMembershipsByEntityIdOutput {
  memberships: Membership[];
  lastEvaluatedKey?: string;
}

export interface GetMembershipsByUserIdInput<T extends MembershipFetchType> {
  userId: UserId;
  type?: T;
  sortByDueAt?: T extends MembershipFetchType.Meeting ? boolean : never;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMembershipsByUserIdOutput<T extends MembershipFetchType> {
  memberships: Membership<T>[];
  lastEvaluatedKey?: string;
}

interface BaseMembership {
  entityId: EntityId;
  userId: UserId;
  type: MembershipType;
  role: Role;
  createdAt: string;
  activeAt: string;
  userName?: string;
}

interface OrganizationMembership extends BaseMembership {
  entityId: OrganizationId;
  type: MembershipType.Organization;
}

interface TeamMembership extends BaseMembership {
  entityId: TeamId;
  type: MembershipType.Team;
}

interface GroupMembership extends BaseMembership {
  entityId: GroupId;
  type: MembershipType.Group;
  userActiveAt: string;
  unseenMessages: number;
}
interface MeetingMembership extends BaseMembership {
  entityId: MeetingId;
  type: MembershipType.Meeting;
  dueAt: string;
  userActiveAt: string;
  unseenMessages: number;
}

interface OneOnOneMembership extends BaseMembership {
  entityId: OneOnOneId;
  type: MembershipType.OneOnOne;
  role: Role.Admin;
  userActiveAt: string;
  unseenMessages: number;
}

type NormalMembershipUpdates = Partial<Pick<Membership, "role" | "activeAt" | "userName">>;
type MeetingMembershipUpdates = Partial<Pick<MeetingMembership, "role" | "activeAt" | "userName" | "dueAt">>;

interface UpdateNormalMembershipInput {
  userId: UserId;
  entityId: EntityId;
  updates: NormalMembershipUpdates;
}

interface UpdateMeetingMembershipInput extends UpdateNormalMembershipInput {
  userId: UserId;
  entityId: MeetingId;
  updates: MeetingMembershipUpdates;
}

type RawMembershipUpdates = MembershipUpdates & { gsi1sk?: Gsi1Sk; gsi2sk?: Gsi2Sk; gsi3sk?: Gsi3Sk; };

interface GetMembershipTypeFromEntityIdInput {
  entityId: EntityId;
}

interface GetMembershipTypeFromEntityIdOutput {
  membershipType: MembershipType;
}
