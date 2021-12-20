import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord } from "@yac/util/src/services/interfaces/dynamo.processor.service.interface";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { RawUser } from "../repositories/user.dynamo.repository";
import { EntityType } from "../enums/entityType.enum";
import { UserServiceInterface } from "../services/tier-1/user.service";
import { InvitationServiceInterface } from "../services/tier-2/invitation.service";
import { PendingInvitation, PendingInvitationRepositoryInterface } from "../repositories/pendingInvitation.dynamo.repository";

@injectable()
export class UserCreatedDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.PendingInvitationRepositoryInterface) private pendingInvitationRepository: PendingInvitationRepositoryInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.InvitationServiceInterface) private invitationService: InvitationServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserCreatedDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isUser = record.newImage.entityType === EntityType.User;
      const isCreation = record.eventName === "INSERT";

      return isCoreTable && isUser && isCreation;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawUser>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { newImage: user } = record;

      const pendingInvitations: PendingInvitation[] = [];

      if (user.email) {
        const { pendingInvitations: pendingEmailInvitations } = await this.pendingInvitationRepository.getPendingInvitations({ email: user.email });
        pendingInvitations.push(...pendingEmailInvitations);
      }

      if (user.phone) {
        const { pendingInvitations: pendingPhoneInvitations } = await this.pendingInvitationRepository.getPendingInvitations({ phone: user.phone });
        pendingInvitations.push(...pendingPhoneInvitations);
      }

      await this.userService.indexUserForSearch({ user });

      await Promise.allSettled([
        this.userService.indexUserForSearch({ user }),
        ...pendingInvitations.map((pendingInvitation) => this.invitationService.processPendingInvitation({ userId: user.id, pendingInvitation })),
      ]);
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserCreatedDynamoProcessorServiceConfigInterface {
  tableNames: {
    core: EnvConfigInterface["tableNames"]["core"];
  }
}
