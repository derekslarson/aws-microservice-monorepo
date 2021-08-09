import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { ListenerMappingRepositoryInterface, ListenerMapping as ListenerMappingEntity } from "../repositories/listenerMapping.dynamo.repository";
import { ListenerType } from "../enums/listenerType.enum";

@injectable()
export class ListenerMappingService implements ListenerMappingServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ListenerMappingRepositoryInterface) private listenerMappingRepository: ListenerMappingRepositoryInterface,
  ) {}

  public async createListenerMapping(params: CreateListenerMappingInput): Promise<CreateListenerMappingOutput> {
    try {
      this.loggerService.trace("createListenerMapping called", { params }, this.constructor.name);

      const { userId, type, value } = params;

      const listenerMapping: ListenerMappingEntity = {
        userId,
        type,
        value,
      };

      await this.listenerMappingRepository.createListenerMapping({ listenerMapping });

      return { listenerMapping };
    } catch (error: unknown) {
      this.loggerService.error("Error in createListenerMapping", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getListenerMappingsByUserIdAndType(params: GetListenerMappingsByUserIdAndTypeInput): Promise<GetListenerMappingsByUserIdAndTypeOutput> {
    try {
      this.loggerService.trace("getListenerMappingsByUserIdAndType called", { params }, this.constructor.name);

      const { userId, type } = params;

      const { listenerMappings } = await this.listenerMappingRepository.getListenerMappingsByUserIdAndType({ userId, type });

      return { listenerMappings };
    } catch (error: unknown) {
      this.loggerService.error("Error in getListenerMappingsByUserIdAndType", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getListenerMappingsByTypeAndValue(params: GetListenerMappingsByTypeAndValueInput): Promise<GetListenerMappingsByTypeAndValueOutput> {
    try {
      this.loggerService.trace("getListenerMappingsByTypeAndValue called", { params }, this.constructor.name);

      const { type, value } = params;

      const { listenerMappings } = await this.listenerMappingRepository.getListenerMappingsByTypeAndValue({ type, value });

      return { listenerMappings };
    } catch (error: unknown) {
      this.loggerService.error("Error in getListenerMappingsByTypeAndValue", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteListenerMapping(params: DeleteListenerMappingInput): Promise<DeleteListenerMappingOutput> {
    try {
      this.loggerService.trace("deleteListenerMapping called", { params }, this.constructor.name);

      const { userId, type, value } = params;

      const listenerMapping: ListenerMappingEntity = {
        userId,
        type,
        value,
      };

      await this.listenerMappingRepository.deleteListenerMapping({ listenerMapping });
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteListenerMapping", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface ListenerMappingServiceInterface {
  createListenerMapping(params: CreateListenerMappingInput): Promise<CreateListenerMappingOutput>;
  getListenerMappingsByUserIdAndType(params: GetListenerMappingsByUserIdAndTypeInput): Promise<GetListenerMappingsByUserIdAndTypeOutput>;
  getListenerMappingsByTypeAndValue(params: GetListenerMappingsByTypeAndValueInput): Promise<GetListenerMappingsByTypeAndValueOutput>
  deleteListenerMapping(params: DeleteListenerMappingInput): Promise<DeleteListenerMappingOutput>;
}

export type ListenerMapping = ListenerMappingEntity;

export interface CreateListenerMappingInput {
  userId: string;
  type: ListenerType;
  value: string;
}

export interface CreateListenerMappingOutput {
  listenerMapping: ListenerMapping;
}

export interface GetListenerMappingsByUserIdAndTypeInput {
  userId: string;
  type: ListenerType;
}

export interface GetListenerMappingsByUserIdAndTypeOutput {
  listenerMappings: ListenerMapping[];
}

export interface GetListenerMappingsByTypeAndValueInput {
  type: ListenerType;
  value: string;
}

export interface GetListenerMappingsByTypeAndValueOutput {
  listenerMappings: ListenerMapping[];
}

export interface DeleteListenerMappingInput {
  userId: string;
  type: ListenerType;
  value: string;
}

export type DeleteListenerMappingOutput = void;
