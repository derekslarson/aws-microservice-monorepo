import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, MeetingId, OrganizationId, TeamId, UserId } from "@yac/util";

import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";
import { ImageMimeType } from "../enums/image.mimeType.enum";
import { KeyPrefix } from "../enums/keyPrefix.enum";

@injectable()
export class MeetingDynamoRepository extends BaseDynamoRepositoryV2<Meeting> implements MeetingRepositoryInterface {
  private gsiOneIndexName: string;

  private gsiTwoIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: MeetingRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);
    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
    this.gsiTwoIndexName = envConfig.globalSecondaryIndexNames.two;
  }

  public async createMeeting(params: CreateMeetingInput): Promise<CreateMeetingOutput> {
    try {
      this.loggerService.trace("createMeeting called", { params }, this.constructor.name);

      const { meeting } = params;

      const meetingEntity: RawMeeting = {
        entityType: EntityType.Meeting,
        pk: meeting.id,
        sk: EntityType.Meeting,
        gsi1pk: meeting.teamId || meeting.organizationId,
        gsi1sk: `${KeyPrefix.Meeting}${KeyPrefix.Active}${meeting.activeAt}`,
        gsi2pk: meeting.teamId || meeting.organizationId,
        gsi2sk: `${KeyPrefix.Meeting}${KeyPrefix.Due}${meeting.dueAt}`,
        ...meeting,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk)",
        Item: meetingEntity,
      }).promise();

      return { meeting };
    } catch (error: unknown) {
      this.loggerService.error("Error in createMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeeting(params: GetMeetingInput): Promise<GetMeetingOutput> {
    try {
      this.loggerService.trace("getMeeting called", { params }, this.constructor.name);

      const { meetingId } = params;

      const meeting = await this.get({ Key: { pk: meetingId, sk: EntityType.Meeting } }, "Meeting");

      return { meeting };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateMeeting(params: UpdateMeetingInput): Promise<UpdateMeetingOutput> {
    try {
      this.loggerService.trace("updateMeeting called", { params }, this.constructor.name);

      const { meetingId, updates } = params;

      const meeting = await this.partialUpdate(meetingId, EntityType.Meeting, updates);

      return { meeting };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeetings(params: GetMeetingsInput): Promise<GetMeetingsOutput> {
    try {
      this.loggerService.trace("getMeetings called", { params }, this.constructor.name);

      const { meetingIds } = params;

      const meetings = await this.batchGet({ Keys: meetingIds.map((meetingId) => ({ pk: meetingId, sk: EntityType.Meeting })) });

      return { meetings };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetings", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeetingsByOrganizationId(params: GetMeetingsByOrganizationIdInput): Promise<GetMeetingsByOrganizationIdOutput> {
    try {
      this.loggerService.trace("getMeetingsByOrganizationId called", { params }, this.constructor.name);

      const { organizationId, byDueAt, exclusiveStartKey, limit } = params;

      const { meetings, lastEvaluatedKey } = await this.getMeetingsByTeamIdOrOrganizationId({ teamIdOrOrganizationId: organizationId, byDueAt, exclusiveStartKey, limit });

      return { meetings, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingsByOrganizationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeetingsByTeamId(params: GetMeetingsByTeamIdInput): Promise<GetMeetingsByTeamIdOutput> {
    try {
      this.loggerService.trace("getMeetingsByTeamId called", { params }, this.constructor.name);

      const { teamId, byDueAt, exclusiveStartKey, limit } = params;

      const { meetings, lastEvaluatedKey } = await this.getMeetingsByTeamIdOrOrganizationId({ teamIdOrOrganizationId: teamId, byDueAt, exclusiveStartKey, limit });

      return { meetings, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingsByTeamId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public convertRawMeetingToMeeting(params: ConvertRawMeetingToMeetingInput): ConvertRawMeetingToMeetingOutput {
    try {
      this.loggerService.trace("convertRawMeetingToMeeting called", { params }, this.constructor.name);

      const { rawMeeting } = params;

      const meeting = this.cleanse(rawMeeting);

      return { meeting };
    } catch (error: unknown) {
      this.loggerService.error("Error in convertRawMeetingToMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private async getMeetingsByTeamIdOrOrganizationId(params: GetMeetingsByTeamIdOrOrganizationIdInput): Promise<GetMeetingsByTeamIdOrOrganizationIdOutput> {
    try {
      this.loggerService.trace("getMeetingsByTeamIdOrOrganizationId called", { params }, this.constructor.name);

      const { teamIdOrOrganizationId, byDueAt, exclusiveStartKey, limit } = params;

      const { Items: meetings, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        ScanIndexForward: false,
        IndexName: byDueAt ? this.gsiTwoIndexName : this.gsiOneIndexName,
        KeyConditionExpression: "#pk = :teamIdOrOrgId AND begins_with(#sk, :skPrefix)",
        ExpressionAttributeNames: {
          "#pk": byDueAt ? "gsi2pk" : "gsi1pk",
          "#sk": byDueAt ? "gsi2sk" : "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":teamIdOrOrgId": teamIdOrOrganizationId,
          ":skPrefix": `${KeyPrefix.Meeting}${byDueAt ? KeyPrefix.Due : KeyPrefix.Active}`,
        },
      });

      return {
        meetings,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingsByTeamIdOrOrganizationId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface MeetingRepositoryInterface {
  createMeeting(params: CreateMeetingInput): Promise<CreateMeetingOutput>;
  getMeeting(params: GetMeetingInput): Promise<GetMeetingOutput>;
  getMeetings(params: GetMeetingsInput): Promise<GetMeetingsOutput>;
  getMeetingsByOrganizationId(params: GetMeetingsByOrganizationIdInput): Promise<GetMeetingsByOrganizationIdOutput>;
  getMeetingsByTeamId(params: GetMeetingsByTeamIdInput): Promise<GetMeetingsByTeamIdOutput>
  updateMeeting(params: UpdateMeetingInput): Promise<UpdateMeetingOutput>;
  convertRawMeetingToMeeting(params: ConvertRawMeetingToMeetingInput): ConvertRawMeetingToMeetingOutput;
}

type MeetingRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface Meeting {
  id: MeetingId;
  organizationId: OrganizationId;
  imageMimeType: ImageMimeType;
  name: string;
  createdBy: UserId;
  createdAt: string;
  updatedAt: string;
  activeAt: string;
  dueAt: string;
  outcomes?: string;
  teamId?: TeamId;
}

export interface RawMeeting extends Meeting {
  entityType: EntityType.Meeting,
  pk: MeetingId;
  sk: EntityType.Meeting;
  gsi1pk: OrganizationId | TeamId;
  gsi1sk: `${KeyPrefix.Meeting}${KeyPrefix.Active}${string}`;
  gsi2pk: OrganizationId | TeamId;
  gsi2sk: `${KeyPrefix.Meeting}${KeyPrefix.Due}${string}`;
}

export interface CreateMeetingInput {
  meeting: Meeting;
}

export interface CreateMeetingOutput {
  meeting: Meeting;
}

export interface GetMeetingInput {
  meetingId: MeetingId;
}

export interface GetMeetingOutput {
  meeting: Meeting;
}

export interface GetMeetingsByOrganizationIdInput {
  organizationId: OrganizationId;
  byDueAt?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMeetingsByOrganizationIdOutput {
  meetings: Meeting[];
  lastEvaluatedKey?: string;
}

export interface GetMeetingsByTeamIdInput {
  teamId: TeamId;
  byDueAt?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMeetingsByTeamIdOutput {
  meetings: Meeting[];
  lastEvaluatedKey?: string;
}

export type MeetingUpdates = Partial<Pick<Meeting, "name" | "imageMimeType">>;

export interface UpdateMeetingInput {
  meetingId: MeetingId;
  updates: MeetingUpdates;
}

export interface UpdateMeetingOutput {
  meeting: Meeting;
}

export interface GetMeetingsInput {
  meetingIds: MeetingId[];
}

export interface GetMeetingsOutput {
  meetings: Meeting[];
}

export interface ConvertRawMeetingToMeetingInput {
  rawMeeting: RawMeeting;

}

export interface ConvertRawMeetingToMeetingOutput {
  meeting: Meeting;
}

interface GetMeetingsByTeamIdOrOrganizationIdInput {
  teamIdOrOrganizationId: TeamId | OrganizationId;
  byDueAt?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}

interface GetMeetingsByTeamIdOrOrganizationIdOutput {
  meetings: Meeting[];
  lastEvaluatedKey?: string;
}
