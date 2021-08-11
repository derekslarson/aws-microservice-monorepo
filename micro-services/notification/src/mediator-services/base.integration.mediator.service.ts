import { injectable, unmanaged } from "inversify";
import { LoggerServiceInterface } from "@yac/util";
import { ListenerMappingServiceInterface } from "../entity-services/listenerMapping.service";
import { ListenerType } from "../enums/listenerType.enum";

@injectable()
export abstract class BaseIntegrationMediatorService implements BaseIntegrationMediatorServiceInterface {
  constructor(
    @unmanaged() private type: ListenerType,
    @unmanaged() protected loggerService: LoggerServiceInterface,
    @unmanaged() private listenerMappingService: ListenerMappingServiceInterface,
  ) {}

  public async persistListener(params: PersistListenerInput): Promise<PersistListenerOutput> {
    try {
      this.loggerService.trace("persistListener called", { params }, this.constructor.name);

      const { userId, listener } = params;

      await this.listenerMappingService.createListenerMapping({ userId, type: this.type, value: listener });
    } catch (error: unknown) {
      this.loggerService.error("Error in persistListener", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteListener(params: DeleteListenerInput): Promise<DeleteListenerOutput> {
    try {
      this.loggerService.trace("deleteListener called", { params }, this.constructor.name);

      const { listener } = params;

      const { listenerMappings } = await this.listenerMappingService.getListenerMappingsByTypeAndValue({ type: this.type, value: listener });

      await Promise.all(listenerMappings.map((listenerMapping) => this.listenerMappingService.deleteListenerMapping({ userId: listenerMapping.userId, type: this.type, value: listener })));
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteListener", { error, params }, this.constructor.name);

      throw error;
    }
  }

  protected async getListenersByUserId(params: GetListenersByUserIdInput): Promise<GetListenersByUserIdOutput> {
    try {
      this.loggerService.trace("getListenersByUserId called", { params }, this.constructor.name);

      const { userId } = params;

      const { listenerMappings } = await this.listenerMappingService.getListenerMappingsByUserIdAndType({ userId, type: this.type });

      const listeners = listenerMappings.map((listenerMapping) => listenerMapping.value);

      return { listeners };
    } catch (error: unknown) {
      this.loggerService.error("Error in getListenersByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface BaseIntegrationMediatorServiceInterface {
  persistListener(params: PersistListenerInput): Promise<PersistListenerOutput>;
  deleteListener(params: DeleteListenerInput): Promise<DeleteListenerOutput>;
}

export interface PersistListenerInput {
  userId: string;
  listener: string;
}

export type PersistListenerOutput = void;

export interface GetListenersByUserIdInput {
  userId: string;
}

export interface GetListenersByUserIdOutput {
  listeners: string[];
}

export interface DeleteListenerInput {
  listener: string;
}

export type DeleteListenerOutput = void;
