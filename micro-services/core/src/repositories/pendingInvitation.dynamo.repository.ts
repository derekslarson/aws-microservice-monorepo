import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, GroupId, LoggerServiceInterface, MeetingId, Role, TeamId, UserId } from "@yac/util";

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

  public async createPendingInvitation<T extends PendingInvitationType>(params: CreatePendingInvitationInput<T>): Promise<CreatePendingInvitationOutput<T>> {
    try {
      this.loggerService.trace("createPendingInvitation called", { params }, this.constructor.name);

      const { pendingInvitation } = params;

      const pendingInvitationEntity: RawPendingInvitation<T> = {
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
  createPendingInvitation<T extends PendingInvitationType>(params: CreatePendingInvitationInput<T>): Promise<CreatePendingInvitationOutput<T>>;
  getPendingInvitations(params: GetPendingInvitationsInput): Promise<GetPendingInvitationsOutput>;
  deletePendingInvitation(params: DeletePendingInvitationInput): Promise<DeletePendingInvitationOutput>;
}

type PendingInvitationRepositoryConfig = Pick<EnvConfigInterface, "tableNames">;

export type InvitingEntityId<T extends PendingInvitationType = PendingInvitationType> =
  T extends PendingInvitationType.Friend ? UserId :
    T extends PendingInvitationType.Team ? TeamId :
      T extends PendingInvitationType.Group ? GroupId :
        T extends PendingInvitationType.Meeting ? MeetingId :
          UserId |TeamId | GroupId | MeetingId;

export type PendingInvitation<T extends PendingInvitationType = PendingInvitationType> = EmailPendingInvitation<T> | PhonePendingInvitation<T>;

export type RawPendingInvitation<T extends PendingInvitationType = PendingInvitationType> = PendingInvitation<T> & {
  entityType: EntityType.PendingInvitation,
  // email | phone
  pk: string;
  sk: Sk<T>;
};

export interface CreatePendingInvitationInput<T extends PendingInvitationType> {
  pendingInvitation: PendingInvitation<T>;
}

export interface CreatePendingInvitationOutput<T extends PendingInvitationType> {
  pendingInvitation: PendingInvitation<T>;
}

export type GetPendingInvitationsInput = EmailGetPendingInvitationsInput | PhoneGetPendingInvitationsInput;

export interface GetPendingInvitationsOutput {
  pendingInvitations: PendingInvitation[];
}

export type DeletePendingInvitationInput = EmailDeletePendingInvitationInput | PhoneDeletePendingInvitationInput;

export type DeletePendingInvitationOutput = void;

type Sk<T extends PendingInvitationType> = `${EntityType.PendingInvitation}-${InvitingEntityId<T>}`;
interface BasePendingInvitation<T extends PendingInvitationType = PendingInvitationType> {
  type: T;
  invitingEntityId: InvitingEntityId<T>;
  createdAt: string;
  role?: Role;
}

interface EmailPendingInvitation<T extends PendingInvitationType = PendingInvitationType> extends BasePendingInvitation<T> {
  email: string;
}

interface PhonePendingInvitation<T extends PendingInvitationType = PendingInvitationType> extends BasePendingInvitation<T> {
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
