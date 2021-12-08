import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, GroupId, LoggerServiceInterface, MeetingId, OrganizationId, Role, TeamId, UserId } from "@yac/util";

import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";
import { PendingInvitationType } from "../enums/pendingInvitationType.enum";

@injectable()
export class PendingInvitationDynamoRepository extends BaseDynamoRepositoryV2<PendingInvitation> implements PendingInvitationRepositoryInterface {
  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: PendingInvitationRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);
  }

  public async createPendingInvitation(params: CreatePendingInvitationInput): Promise<CreatePendingInvitationOutput> {
    try {
      this.loggerService.trace("createPendingInvitation called", { params }, this.constructor.name);

      const { pendingInvitation } = params;

      const pendingInvitationEntity: RawPendingInvitation = {
        entityType: EntityType.PendingInvitation,
        pk: "email" in pendingInvitation ? pendingInvitation.email : pendingInvitation.phone,
        sk: `${EntityType.PendingInvitation}-${pendingInvitation.invitingEntityId}`,
        ...pendingInvitation,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk)",
        Item: pendingInvitationEntity,
      }).promise();

      return { pendingInvitation };
    } catch (error: unknown) {
      this.loggerService.error("Error in createPendingInvitation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getPendingInvitations(params: GetPendingInvitationsInput): Promise<GetPendingInvitationsOutput> {
    try {
      this.loggerService.trace("getPendingInvitations called", { params }, this.constructor.name);

      const { Items: pendingInvitations } = await this.query({
        KeyConditionExpression: "#pk = :emailOrPhone AND begins_with(#sk, :pendingInvitation)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
        },
        ExpressionAttributeValues: {
          ":emailOrPhone": "email" in params ? params.email : params.phone,
          ":pendingInvitation": EntityType.PendingInvitation,
        },
      });

      return { pendingInvitations };
    } catch (error: unknown) {
      this.loggerService.error("Error in getPendingInvitations", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deletePendingInvitation(params: DeletePendingInvitationInput): Promise<DeletePendingInvitationOutput> {
    try {
      this.loggerService.trace("deletePendingInvitation called", { params }, this.constructor.name);

      const { invitingEntityId } = params;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: {
          pk: "email" in params ? params.email : params.phone,
          sk: `${EntityType.PendingInvitation}-${invitingEntityId}`,
        },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deletePendingInvitation", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface PendingInvitationRepositoryInterface {
  createPendingInvitation(params: CreatePendingInvitationInput): Promise<CreatePendingInvitationOutput>;
  getPendingInvitations(params: GetPendingInvitationsInput): Promise<GetPendingInvitationsOutput>;
  deletePendingInvitation(params: DeletePendingInvitationInput): Promise<DeletePendingInvitationOutput>;
}

export type InvitingEntityId = UserId | OrganizationId | TeamId | GroupId | MeetingId;

export type PendingInvitation = EmailPendingInvitation | PhonePendingInvitation;

export type RawPendingInvitation = PendingInvitation & {
  entityType: EntityType.PendingInvitation,
  // email | phone
  pk: string;
  // `${EntityType.PendingInvitation}-${InvitingEntityId}`
  sk: Sk;
};

export interface CreatePendingInvitationInput {
  pendingInvitation: PendingInvitation;
}

export interface CreatePendingInvitationOutput {
  pendingInvitation: PendingInvitation;
}

export type GetPendingInvitationsInput = EmailGetPendingInvitationsInput | PhoneGetPendingInvitationsInput;

export interface GetPendingInvitationsOutput {
  pendingInvitations: PendingInvitation[];
}

export type DeletePendingInvitationInput = EmailDeletePendingInvitationInput | PhoneDeletePendingInvitationInput;

export type DeletePendingInvitationOutput = void;

type PendingInvitationRepositoryConfig = Pick<EnvConfigInterface, "tableNames">;

type Sk = `${EntityType.PendingInvitation}-${InvitingEntityId}`;

interface BasePendingInvitation {
  type: PendingInvitationType;
  invitingEntityId: InvitingEntityId;
  createdAt: string;
  role?: Role;
}

interface EmailPendingInvitation extends BasePendingInvitation {
  email: string;
}

interface PhonePendingInvitation extends BasePendingInvitation {
  phone: string;
}

interface EmailGetPendingInvitationsInput {
  email: string;
}

interface PhoneGetPendingInvitationsInput {
  phone: string;
}

interface BaseDeletePendingInvitationInput {
  invitingEntityId: InvitingEntityId;
}

interface EmailDeletePendingInvitationInput extends BaseDeletePendingInvitationInput {
  email: string;
}

interface PhoneDeletePendingInvitationInput extends BaseDeletePendingInvitationInput {
  phone: string;
}
