/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { inject, injectable } from "inversify";
import { LoggerServiceInterface, Role } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { PendingInvitationRepositoryInterface, InvitingEntityId, PendingInvitation as PendingInvitationEntity } from "../repositories/pendingInvitation.dynamo.repository";
import { PendingInvitationType } from "../enums/pendingInvitationType.enum";

@injectable()
export class PendingInvitationService implements PendingInvitationServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.PendingInvitationRepositoryInterface) private pendingInvitationRepository: PendingInvitationRepositoryInterface,
  ) {}

  public async createPendingInvitation<T extends PendingInvitationType>(params: CreatePendingInvitationInput<T>): Promise<CreatePendingInvitationOutput<T>> {
    try {
      this.loggerService.trace("createPendingInvitation called", { params }, this.constructor.name);

      const { type, invitingEntityId, role } = params;

      const basePendingInvitation: Omit<PendingInvitationEntity<T>, "email" | "phone"> = {
        type,
        invitingEntityId,
        role,
        createdAt: new Date().toISOString(),
      };

      const pendingInvitation: PendingInvitationEntity<T> = {
        ...basePendingInvitation,
        ...("email" in params ? { email: params.email } : { phone: params.phone }),
      };

      await this.pendingInvitationRepository.createPendingInvitation({ pendingInvitation });

      return { pendingInvitation };
    } catch (error: unknown) {
      this.loggerService.error("Error in createPendingInvitation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getPendingInvitations(params: GetPendingInvitationsInput): Promise<GetPendingInvitationsOutput> {
    try {
      this.loggerService.trace("getPendingInvitations called", { params }, this.constructor.name);

      const { pendingInvitations } = await this.pendingInvitationRepository.getPendingInvitations(params);

      return { pendingInvitations };
    } catch (error: unknown) {
      this.loggerService.error("Error in getPendingInvitations", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deletePendingInvitation(params: DeletePendingInvitationInput): Promise<DeletePendingInvitationOutput> {
    try {
      this.loggerService.trace("deletePendingInvitation called", { params }, this.constructor.name);

      await this.pendingInvitationRepository.deletePendingInvitation(params);
    } catch (error: unknown) {
      this.loggerService.error("Error in deletePendingInvitation", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface PendingInvitationServiceInterface {
  createPendingInvitation<T extends PendingInvitationType>(params: CreatePendingInvitationInput<T>): Promise<CreatePendingInvitationOutput<T>>;
  getPendingInvitations(params: GetPendingInvitationsInput): Promise<GetPendingInvitationsOutput>;
  deletePendingInvitation(params: DeletePendingInvitationInput): Promise<DeletePendingInvitationOutput>;
}

export type PendingInvitation<T extends PendingInvitationType = PendingInvitationType> = PendingInvitationEntity<T>;

interface BaseCreatePendingInvitationInput<T extends PendingInvitationType> {
  type: T;
  invitingEntityId: InvitingEntityId<T>;
  role?: Role;
}

interface EmailCreatePendingInvitationInput<T extends PendingInvitationType> extends BaseCreatePendingInvitationInput<T> {
  email: string;
}

interface PhoneCreatePendingInvitationInput<T extends PendingInvitationType> extends BaseCreatePendingInvitationInput<T> {
  phone: string;
}

export type CreatePendingInvitationInput<T extends PendingInvitationType> =EmailCreatePendingInvitationInput<T> | PhoneCreatePendingInvitationInput<T>;

export interface CreatePendingInvitationOutput<T extends PendingInvitationType> {
  pendingInvitation: PendingInvitation<T>;
}

interface EmailGetPendingInvitationsInput {
  email: string;
}

interface PhoneGetPendingInvitationsInput {
  phone: string;
}

export type GetPendingInvitationsInput = EmailGetPendingInvitationsInput | PhoneGetPendingInvitationsInput;

export interface GetPendingInvitationsOutput {
  pendingInvitations: PendingInvitation[];
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

export type DeletePendingInvitationInput = EmailDeletePendingInvitationInput | PhoneDeletePendingInvitationInput;

export type DeletePendingInvitationOutput = void;
