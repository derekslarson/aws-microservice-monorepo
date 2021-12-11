import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface } from "@yac/util";

import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityTypeV2 } from "../enums/entityTypeV2.enum";
import { ImageMimeType } from "../enums/image.mimeType.enum";
import { KeyPrefixV2 } from "../enums/keyPrefixV2.enum";
import { OrganizationId } from "./organization.dynamo.repository.v2";
import { TeamId } from "./team.dynamo.repository.v2";

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
        entityType: EntityTypeV2.Meeting,
        pk: meeting.id,
        sk: EntityTypeV2.Meeting,
        gsi1pk: meeting.teamId || meeting.organizationId,
        gsi1sk: `${KeyPrefixV2.Meeting}${KeyPrefixV2.Active}${meeting.activeAt}`,
        gsi2pk: meeting.teamId || meeting.organizationId,
        gsi2sk: `${KeyPrefixV2.Meeting}${KeyPrefixV2.Due}${meeting.dueAt}`,
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

      const meeting = await this.get({ Key: { pk: meetingId, sk: EntityTypeV2.Meeting } }, "Meeting");

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

      const meeting = await this.partialUpdate(meetingId, EntityTypeV2.Meeting, updates);

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

      const meetings = await this.batchGet({ Keys: meetingIds.map((meetingId) => ({ pk: meetingId, sk: EntityTypeV2.Meeting })) });

      return { meetings };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetings", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeetingsByOrganizationId(params: GetMeetingsByOrganizationIdInput): Promise<GetMeetingsByOrganizationIdOutput> {
    try {
      this.loggerService.trace("getMeetingsByOrganizationId called", { params }, this.constructor.name);

      const { organizationId, byDueDate, exclusiveStartKey, limit } = params;

      const { meetings, lastEvaluatedKey } = await this.getMeetingsByTeamIdOrOrganizationId({ teamIdOrOrganizationId: organizationId, byDueDate, exclusiveStartKey, limit });

      return { meetings, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingsByOrganizationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeetingsByTeamId(params: GetMeetingsByTeamIdInput): Promise<GetMeetingsByTeamIdOutput> {
    try {
      this.loggerService.trace("getMeetingsByTeamId called", { params }, this.constructor.name);

      const { teamId, byDueDate, exclusiveStartKey, limit } = params;

      const { meetings, lastEvaluatedKey } = await this.getMeetingsByTeamIdOrOrganizationId({ teamIdOrOrganizationId: teamId, byDueDate, exclusiveStartKey, limit });

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

      const { teamIdOrOrganizationId, byDueDate, exclusiveStartKey, limit } = params;

      const { Items: meetings, LastEvaluatedKey } = await this.query({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        Limit: limit ?? 25,
        ScanIndexForward: false,
        IndexName: byDueDate ? this.gsiTwoIndexName : this.gsiOneIndexName,
        KeyConditionExpression: "#pk = :teamIdOrOrgId AND begins_with(#sk, :skPrefix)",
        ExpressionAttributeNames: {
          "#pk": byDueDate ? "gsi2pk" : "gsi1pk",
          "#sk": byDueDate ? "gsi2sk" : "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":teamIdOrOrgId": teamIdOrOrganizationId,
          ":skPrefix": `${KeyPrefixV2.Meeting}${byDueDate ? KeyPrefixV2.Due : KeyPrefixV2.Active}`,
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
  createdAt: string;
  updatedAt: string;
  activeAt: string;
  dueAt: string;
  outcomes?: string;
  teamId?: TeamId;
}

export interface RawMeeting extends Meeting {
  entityType: EntityTypeV2.Meeting,
  pk: MeetingId;
  sk: EntityTypeV2.Meeting;
  gsi1pk: OrganizationId | TeamId;
  gsi1sk: `${KeyPrefixV2.Meeting}${KeyPrefixV2.Active}${string}`;
  gsi2pk: OrganizationId | TeamId;
  gsi2sk: `${KeyPrefixV2.Meeting}${KeyPrefixV2.Due}${string}`;
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
  byDueDate?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMeetingsByOrganizationIdOutput {
  meetings: Meeting[];
  lastEvaluatedKey?: string;
}

export interface GetMeetingsByTeamIdInput {
  teamId: TeamId;
  byDueDate?: boolean;
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

export type MeetingId = `${KeyPrefixV2.Meeting}${string}`;

interface GetMeetingsByTeamIdOrOrganizationIdInput {
  teamIdOrOrganizationId: TeamId | OrganizationId;
  byDueDate?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}

interface GetMeetingsByTeamIdOrOrganizationIdOutput {
  meetings: Meeting[];
  lastEvaluatedKey?: string;
}
