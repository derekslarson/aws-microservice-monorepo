import { inject, injectable } from "inversify";
import { LoggerServiceInterface, NotFoundError } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { UniquePropertyRepositoryInterface, UniqueProperty as UniquePropertyEntity } from "../repositories/uniqueProperty.dynamo.repository";
import { UniqueProperty as UniquePropertyEnum } from "../enums/uniqueProperty.enum";
import { UserId } from "../types/userId.type";

@injectable()
export class UniquePropertyService implements UniquePropertyServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UniquePropertyRepositoryInterface) private uniquePropertyRepository: UniquePropertyRepositoryInterface,
  ) {}

  public async createUniqueProperty(params: CreateUniquePropertyInput): Promise<CreateUniquePropertyOutput> {
    try {
      this.loggerService.trace("createUniqueProperty called", { params }, this.constructor.name);

      const { property, value, userId } = params;

      const uniqueProperty: UniquePropertyEntity = {
        property,
        value,
        userId,
      };

      await this.uniquePropertyRepository.createUniqueProperty({ uniqueProperty });

      return { uniqueProperty };
    } catch (error: unknown) {
      this.loggerService.error("Error in createUniqueProperty", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getUniqueProperty(params: GetUniquePropertyInput): Promise<GetUniquePropertyOutput> {
    try {
      this.loggerService.trace("getUniqueProperty called", { params }, this.constructor.name);

      const { property, value } = params;

      const { uniqueProperty } = await this.uniquePropertyRepository.getUniqueProperty({ property, value });

      return { uniqueProperty };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUniqueProperty", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async isPropertyUnique(params: IsPropertyUniqueInput): Promise<IsPropertyUniqueOutput> {
    try {
      this.loggerService.trace("isPropertyUnique called", { params }, this.constructor.name);

      const { property, value } = params;

      await this.uniquePropertyRepository.getUniqueProperty({ property, value });

      return { isPropertyUnique: false };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return { isPropertyUnique: true };
      }

      this.loggerService.error("Error in isPropertyUnique", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteUniqueProperty(params: DeleteUniquePropertyInput): Promise<DeleteUniquePropertyOutput> {
    try {
      this.loggerService.trace("deleteUniqueProperty called", { params }, this.constructor.name);

      const { property, value } = params;

      await this.uniquePropertyRepository.deleteUniqueProperty({ property, value });
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteUniqueProperty", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface UniquePropertyServiceInterface {
  createUniqueProperty(params: CreateUniquePropertyInput): Promise<CreateUniquePropertyOutput>;
  getUniqueProperty(params: GetUniquePropertyInput): Promise<GetUniquePropertyOutput>;
  isPropertyUnique(params: IsPropertyUniqueInput): Promise<IsPropertyUniqueOutput>;
  deleteUniqueProperty(params: DeleteUniquePropertyInput): Promise<DeleteUniquePropertyOutput>;
}

export type UniqueProperty = UniquePropertyEntity;

export interface CreateUniquePropertyInput {
  property: UniquePropertyEnum;
  value: string;
  userId: UserId;
}

export interface CreateUniquePropertyOutput {
  uniqueProperty: UniqueProperty;
}

export interface GetUniquePropertyInput {
  property: UniquePropertyEnum;
  value: string;
}

export interface GetUniquePropertyOutput {
  uniqueProperty: UniqueProperty;
}

export interface IsPropertyUniqueInput {
  property: UniquePropertyEnum;
  value: string;
}

export interface IsPropertyUniqueOutput {
  isPropertyUnique: boolean;
}

export interface DeleteUniquePropertyInput {
  property: UniquePropertyEnum;
  value: string;
}

export type DeleteUniquePropertyOutput = void;
