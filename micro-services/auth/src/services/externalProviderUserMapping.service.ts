import { inject, injectable } from "inversify";
import { LoggerServiceInterface, UserId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { ExternalProviderUserMappingRepositoryInterface, ExternalProviderUserMapping as ExternalProviderUserMappingEntity } from "../repositories/externalProviderUserMapping.dynamo.repository";

@injectable()
export class ExternalProviderUserMappingService implements ExternalProviderUserMappingServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ExternalProviderUserMappingRepositoryInterface) private externalProviderUserMappingRepository: ExternalProviderUserMappingRepositoryInterface,
  ) {}

  public async createExternalProviderUserMapping(params: CreateExternalProviderUserMappingInput): Promise<CreateExternalProviderUserMappingOutput> {
    try {
      this.loggerService.trace("createExternalProviderUserMapping called", { params }, this.constructor.name);

      const { userId, externalProviderId } = params;

      const externalProviderUserMapping: ExternalProviderUserMappingEntity = {
        userId,
        externalProviderId,
      };

      await this.externalProviderUserMappingRepository.createExternalProviderUserMapping({ externalProviderUserMapping });

      return { externalProviderUserMapping };
    } catch (error: unknown) {
      this.loggerService.error("Error in createExternalProviderUserMapping", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getExternalProviderUserMappingsByUserId(params: GetExternalProviderUserMappingsByUserIdInput): Promise<GetExternalProviderUserMappingsByUserIdOutput> {
    try {
      this.loggerService.trace("getExternalProviderUserMappingsByUserId called", { params }, this.constructor.name);

      const { userId } = params;

      const { externalProviderUserMappings } = await this.externalProviderUserMappingRepository.getExternalProviderUserMappingsByUserId({ userId });

      return { externalProviderUserMappings };
    } catch (error: unknown) {
      this.loggerService.error("Error in getExternalProviderUserMappingsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getExternalProviderUserMappingsByExternalProviderId(params: GetExternalProviderUserMappingsByExternalProviderIdInput): Promise<GetExternalProviderUserMappingsByExternalProviderIdOutput> {
    try {
      this.loggerService.trace("getExternalProviderUserMappingsByExternalProviderId called", { params }, this.constructor.name);

      const { externalProviderId } = params;

      const { externalProviderUserMappings } = await this.externalProviderUserMappingRepository.getExternalProviderUserMappingsByExternalProviderId({ externalProviderId });

      return { externalProviderUserMappings };
    } catch (error: unknown) {
      this.loggerService.error("Error in getExternalProviderUserMappingsByExternalProviderId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteExternalProviderUserMapping(params: DeleteExternalProviderUserMappingInput): Promise<DeleteExternalProviderUserMappingOutput> {
    try {
      this.loggerService.trace("deleteExternalProviderUserMapping called", { params }, this.constructor.name);

      const { userId, externalProviderId } = params;

      await this.externalProviderUserMappingRepository.deleteExternalProviderUserMapping({ userId, externalProviderId });
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteExternalProviderUserMapping", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface ExternalProviderUserMappingServiceInterface {
  createExternalProviderUserMapping(params: CreateExternalProviderUserMappingInput): Promise<CreateExternalProviderUserMappingOutput>;
  getExternalProviderUserMappingsByUserId(params: GetExternalProviderUserMappingsByUserIdInput): Promise<GetExternalProviderUserMappingsByUserIdOutput>;
  getExternalProviderUserMappingsByExternalProviderId(params: GetExternalProviderUserMappingsByExternalProviderIdInput): Promise<GetExternalProviderUserMappingsByExternalProviderIdOutput>
  deleteExternalProviderUserMapping(params: DeleteExternalProviderUserMappingInput): Promise<DeleteExternalProviderUserMappingOutput>;
}

export type ExternalProviderUserMapping = ExternalProviderUserMappingEntity;

export interface CreateExternalProviderUserMappingInput {
  userId: UserId;
  externalProviderId: string;
}

export interface CreateExternalProviderUserMappingOutput {
  externalProviderUserMapping: ExternalProviderUserMapping;
}

export interface GetExternalProviderUserMappingsByUserIdInput {
  userId: UserId;
}

export interface GetExternalProviderUserMappingsByUserIdOutput {
  externalProviderUserMappings: ExternalProviderUserMapping[];
}

export interface GetExternalProviderUserMappingsByExternalProviderIdInput {
  externalProviderId: string;
}

export interface GetExternalProviderUserMappingsByExternalProviderIdOutput {
  externalProviderUserMappings: ExternalProviderUserMapping[];
}

export interface DeleteExternalProviderUserMappingInput {
  userId: UserId;
  externalProviderId: string;
}

export type DeleteExternalProviderUserMappingOutput = void;
