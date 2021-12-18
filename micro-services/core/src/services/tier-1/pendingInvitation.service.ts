import { inject, injectable } from "inversify";
import { BadRequestError, LoggerServiceInterface, Role } from "@yac/util";
import { TYPES } from "../../inversion-of-control/types";
import { InvitingEntityId, PendingInvitation as PendingInvitationEntity, PendingInvitationRepositoryInterface } from "../../repositories/pendingInvitation.dynamo.repository";
import { PendingInvitationType } from "../../enums/pendingInvitationType.enum";

@injectable()
export class PendingInvitationService implements PendingInvitationServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.PendingInvitationRepositoryInterface) private pendingInvitationRepository: PendingInvitationRepositoryInterface,
  ) {}

  public async createPendingInvitation(params: CreatePendingInvitationInput): Promise<CreatePendingInvitationOutput> {
    try {
      this.loggerService.trace("createPendingInvitation called", { params }, this.constructor.name);

      const { type, invitingEntityId, role } = params;

      if (type !== PendingInvitationType.OneOnOne && !role) {
        throw new BadRequestError("role is required.");
      }

      const pendingInvitation: PendingInvitationEntity = {
        type,
        invitingEntityId,
        role,
        createdAt: new Date().toISOString(),
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
  createPendingInvitation(params: CreatePendingInvitationInput): Promise<CreatePendingInvitationOutput>;
  getPendingInvitations(params: GetPendingInvitationsInput): Promise<GetPendingInvitationsOutput>;
  deletePendingInvitation(params: DeletePendingInvitationInput): Promise<DeletePendingInvitationOutput>;
}

export type PendingInvitation = PendingInvitationEntity;

export type CreatePendingInvitationInput =EmailCreatePendingInvitationInput | PhoneCreatePendingInvitationInput;

export interface CreatePendingInvitationOutput {
  pendingInvitation: PendingInvitation;
}

export type GetPendingInvitationsInput = EmailGetPendingInvitationsInput | PhoneGetPendingInvitationsInput;

export interface GetPendingInvitationsOutput {
  pendingInvitations: PendingInvitation[];
}

export type DeletePendingInvitationInput = EmailDeletePendingInvitationInput | PhoneDeletePendingInvitationInput;

export type DeletePendingInvitationOutput = void;

interface BaseCreatePendingInvitationInput {
  type: PendingInvitationType;
  invitingEntityId: InvitingEntityId;
  role?: Role;
}

interface EmailCreatePendingInvitationInput extends BaseCreatePendingInvitationInput {
  email: string;
}

interface PhoneCreatePendingInvitationInput extends BaseCreatePendingInvitationInput {
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
