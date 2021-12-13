import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, Role } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityTypeV2 } from "../enums/entityTypeV2.enum";
import { KeyPrefixV2 } from "../enums/keyPrefixV2.enum";
import { MeetingId } from "./meeting.dynamo.repository";
import { UserId } from "./user.dynamo.repository.v2";
import { MessageId } from "./message.dynamo.repository.v2";

@injectable()
export class MeetingMembershipDynamoRepository extends BaseDynamoRepositoryV2<MeetingMembership> implements MeetingMembershipRepositoryInterface {
  private gsiOneIndexName: string;

  private gsiTwoIndexName: string;

  private gsiThreeIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: MeetingMembershipRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);

    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
    this.gsiTwoIndexName = envConfig.globalSecondaryIndexNames.two;
    this.gsiThreeIndexName = envConfig.globalSecondaryIndexNames.three;
  }

  public async createMeetingMembership(params: CreateMeetingMembershipInput): Promise<CreateMeetingMembershipOutput> {
    try {
      this.loggerService.trace("createMeetingMembership called", { params }, this.constructor.name);

      const { meetingMembership } = params;

      const meetingMembershipEntity: RawMeetingMembership = {
        entityType: EntityTypeV2.MeetingMembership,
        pk: meetingMembership.userId,
        sk: meetingMembership.meetingId,
        gsi1pk: meetingMembership.meetingId,
        gsi1sk: `${KeyPrefixV2.User}${KeyPrefixV2.Active}${meetingMembership.userActiveAt}`,
        gsi2pk: meetingMembership.userId,
        gsi2sk: `${KeyPrefixV2.Meeting}${KeyPrefixV2.Active}${meetingMembership.meetingActiveAt}`,
        gsi3pk: meetingMembership.userId,
        gsi3sk: `${KeyPrefixV2.Meeting}${KeyPrefixV2.Due}${meetingMembership.meetingDueAt}`,
        ...meetingMembership,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk)",
        Item: meetingMembershipEntity,
      }).promise();

      return { meetingMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in createMeetingMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeetingMembership(params: GetMeetingMembershipInput): Promise<GetMeetingMembershipOutput> {
    try {
      this.loggerService.trace("getMeetingMembership called", { params }, this.constructor.name);

      const { meetingId, userId } = params;

      const meetingMembership = await this.get({ Key: { pk: userId, sk: meetingId } }, "Meeting Membership");

      return { meetingMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateMeetingMembership(params: UpdateMeetingMembershipInput): Promise<UpdateMeetingMembershipOutput> {
    try {
      this.loggerService.trace("updateMeetingMembership called", { params }, this.constructor.name);

      const { userId, meetingId, updates } = params;

      const rawUpdates: UpdateMeetingMembershipRawUpdates = { ...updates };

      if (updates.userActiveAt) {
        rawUpdates.gsi1sk = `${KeyPrefixV2.User}${KeyPrefixV2.Active}${updates.userActiveAt}`;
      }

      if (updates.meetingActiveAt) {
        rawUpdates.gsi2sk = `${KeyPrefixV2.Meeting}${KeyPrefixV2.Active}${updates.meetingActiveAt}`;
      }

      if (updates.meetingDueAt) {
        rawUpdates.gsi3sk = `${KeyPrefixV2.Meeting}${KeyPrefixV2.Due}${updates.meetingDueAt}`;
      }

      const meetingMembership = await this.partialUpdate(userId, meetingId, rawUpdates);

      return { meetingMembership };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMeetingMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteMeetingMembership(params: DeleteMeetingMembershipInput): Promise<DeleteMeetingMembershipOutput> {
    try {
      this.loggerService.trace("deleteMeetingMembership called", { params }, this.constructor.name);

      const { meetingId, userId } = params;
      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: userId, sk: meetingId },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteMeetingMembership", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeetingMembershipsByMeetingId(params: GetMeetingMembershipsByMeetingIdInput): Promise<GetMeetingMembershipsByMeetingIdOutput> {
    try {
      this.loggerService.trace("getMeetingMembershipsByMeetingId called", { params }, this.constructor.name);

      const { meetingId, exclusiveStartKey, limit } = params;

      const { Items: meetingMemberships, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        IndexName: this.gsiOneIndexName,
        KeyConditionExpression: "#gsi1pk = :meetingId AND begins_with(#gsi1sk, :userActive)",
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":meetingId": meetingId,
          ":userActive": `${KeyPrefixV2.User}${KeyPrefixV2.Active}`,
        },
      });

      return {
        meetingMemberships,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingMembershipsByMeetingId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeetingMembershipsByUserId(params: GetMeetingMembershipsByUserIdInput): Promise<GetMeetingMembershipsByUserIdOutput> {
    try {
      this.loggerService.trace("getMeetingMembershipsByUserId called", { params }, this.constructor.name);

      const { userId, byDueAt, exclusiveStartKey, limit } = params;

      const { Items: meetingMemberships, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        IndexName: byDueAt ? this.gsiThreeIndexName : this.gsiTwoIndexName,
        KeyConditionExpression: "#pk = :userId AND begins_with(#sk, :skPrefix)",
        ExpressionAttributeNames: {
          "#pk": byDueAt ? "gsi3pk" : "gsi2pk",
          "#sk": byDueAt ? "gsi3pk" : "gsi2sk",
        },
        ExpressionAttributeValues: {
          ":userId": userId,
          ":skPrefix": `${KeyPrefixV2.Meeting}${byDueAt ? KeyPrefixV2.Due : KeyPrefixV2.Active}`,
        },
      });

      return {
        meetingMemberships,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingMembershipsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface MeetingMembershipRepositoryInterface {
  createMeetingMembership(params: CreateMeetingMembershipInput): Promise<CreateMeetingMembershipOutput>;
  getMeetingMembership(params: GetMeetingMembershipInput): Promise<GetMeetingMembershipOutput>;
  updateMeetingMembership(params: UpdateMeetingMembershipInput): Promise<UpdateMeetingMembershipOutput>;
  deleteMeetingMembership(params: DeleteMeetingMembershipInput): Promise<DeleteMeetingMembershipOutput>;
  getMeetingMembershipsByMeetingId(params: GetMeetingMembershipsByMeetingIdInput): Promise<GetMeetingMembershipsByMeetingIdOutput>;
  getMeetingMembershipsByUserId(params: GetMeetingMembershipsByUserIdInput): Promise<GetMeetingMembershipsByUserIdOutput>;
}

type MeetingMembershipRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface MeetingMembership {
  userId: UserId;
  meetingId: MeetingId;
  role: Role;
  createdAt: string;
  userActiveAt: string;
  meetingActiveAt: string;
  meetingDueAt: string;
}
export interface RawMeetingMembership extends MeetingMembership {
  entityType: EntityTypeV2.MeetingMembership,
  pk: UserId;
  sk: MeetingId;
  gsi1pk: MeetingId;
  gsi1sk: Gsi1Sk;
  gsi2pk: UserId;
  gsi2sk: Gsi2Sk;
  gsi3pk: UserId;
  gsi3sk: Gsi3Sk;
}

export interface CreateMeetingMembershipInput {
  meetingMembership: MeetingMembership;
}

export interface CreateMeetingMembershipOutput {
  meetingMembership: MeetingMembership;
}

export interface GetMeetingMembershipInput {
  meetingId: MeetingId;
  userId: UserId;
}

export interface GetMeetingMembershipOutput {
  meetingMembership: MeetingMembership;
}

export interface DeleteMeetingMembershipInput {
  meetingId: MeetingId;
  userId: UserId;
}

export type DeleteMeetingMembershipOutput = void;

export interface GetMeetingMembershipsByMeetingIdInput {
  meetingId: MeetingId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMeetingMembershipsByMeetingIdOutput {
  meetingMemberships: MeetingMembership[];
  lastEvaluatedKey?: string;
}

export interface GetMeetingMembershipsByUserIdInput {
  userId: UserId;
  byDueAt?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMeetingMembershipsByUserIdOutput {
  meetingMemberships: MeetingMembership[];
  lastEvaluatedKey?: string;
}

export interface AddUnreadMessageToMeetingMembershipInput {
  userId: UserId;
  meetingId: MeetingId;
  messageId: MessageId;
}

export interface AddUnreadMessageToMeetingMembershipOutput{
  meetingMembership: MeetingMembership;
}

export interface RemoveUnreadMessageFromMeetingMembershipInput {
  userId: UserId;
  meetingId: MeetingId;
  messageId: MessageId;
}

export interface RemoveUnreadMessageFromMeetingMembershipOutput {
  meetingMembership: MeetingMembership;
}

export interface UpdateMeetingMembershipInput {
  userId: UserId;
  meetingId: MeetingId;
  updates: UpdateMeetingMembershipUpdates;
}

export interface UpdateMeetingMembershipOutput {
  meetingMembership: MeetingMembership;
}

type UpdateMeetingMembershipUpdates = Partial<Pick<MeetingMembership, "role" | "meetingDueAt" | "userActiveAt" | "meetingActiveAt">>;
type UpdateMeetingMembershipRawUpdates = UpdateMeetingMembershipUpdates & { gsi1sk?: Gsi1Sk; gsi2sk?: Gsi2Sk; gsi3sk?: Gsi3Sk; };

type Gsi1Sk = `${KeyPrefixV2.User}${KeyPrefixV2.Active}${string}`;
type Gsi2Sk = `${KeyPrefixV2.Meeting}${KeyPrefixV2.Active}${string}`;
type Gsi3Sk = `${KeyPrefixV2.Meeting}${KeyPrefixV2.Due}${string}`;
