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
        pk: pendingInvitation.emailOrPhone,
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

      const { emailOrPhone } = params;

      const { Items: pendingInvitations } = await this.query({
        KeyConditionExpression: "#pk = :emailOrPhone AND begins_with(#sk, :pendingInvitation)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
        },
        ExpressionAttributeValues: {
          ":emailOrPhone": emailOrPhone,
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

      const { emailOrPhone, invitingEntityId } = params;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: emailOrPhone, sk: `${EntityType.PendingInvitation}-${invitingEntityId}` },
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
  deletePendingInvitation(params: DeletePendingInvitationInput):DeletePendingInvitationOutput;
}

type PendingInvitationRepositoryConfig = Pick<EnvConfigInterface, "tableNames">;

type InvitingEntityId<T extends PendingInvitationType | void = void> =
  T extends PendingInvitationType.Friend ? UserId :
    T extends PendingInvitationType.Team ? TeamId :
      T extends PendingInvitationType.Group ? GroupId :
        T extends PendingInvitationType.Meeting ? MeetingId :
          UserId |TeamId | GroupId | MeetingId;

export interface PendingInvitation<T extends PendingInvitationType | void = void> {
  emailOrPhone: string;
  type: T;
  invitingEntityId: InvitingEntityId<T>;
  role?: Role;
}

type Sk<T extends PendingInvitationType> = `${EntityType.PendingInvitation}-${InvitingEntityId<T>}`;

export interface RawPendingInvitation<T extends PendingInvitationType> extends PendingInvitation<T> {
  entityType: EntityType.PendingInvitation,
  // email | phone
  pk: string;
  sk: Sk<T>;
}

export interface CreatePendingInvitationInput<T extends PendingInvitationType> {
  pendingInvitation: PendingInvitation<T>;
}

export interface CreatePendingInvitationOutput<T extends PendingInvitationType> {
  pendingInvitation: PendingInvitation<T>;
}

export interface GetPendingInvitationsInput {
  emailOrPhone: UserId;
}

export interface GetPendingInvitationsOutput {
  pendingInvitations: PendingInvitation[];
}

export interface DeletePendingInvitationInput {
  emailOrPhone: UserId;
  invitingEntityId: InvitingEntityId;
}

export type DeletePendingInvitationOutput = void;
