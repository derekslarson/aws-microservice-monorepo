import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { UserAddedToOrganizationSnsServiceInterface } from "../sns-services/userAddedToOrganization.sns.service";
import { RawOrganizationUserRelationship } from "../repositories/organizationUserRelationship.dynamo.repository";
import { OrganizationMediatorServiceInterface } from "../mediator-services/organization.mediator.service";
import { UserMediatorServiceInterface } from "../mediator-services/user.mediator.service";

@injectable()
export class UserAddedToOrganizationDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserAddedToOrganizationSnsServiceInterface) private userAddedToOrganizationSnsService: UserAddedToOrganizationSnsServiceInterface,
    @inject(TYPES.OrganizationMediatorServiceInterface) private organizationMediatorService: OrganizationMediatorServiceInterface,
    @inject(TYPES.UserMediatorServiceInterface) private userMediatorService: UserMediatorServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserAddedToOrganizationDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isOrganizationUserRelationship = record.newImage.entityType === EntityType.OrganizationUserRelationship;
      const isCreation = record.eventName === "INSERT";

      return isCoreTable && isOrganizationUserRelationship && isCreation;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawOrganizationUserRelationship>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { newImage: { organizationId, userId, role } } = record;

      const [ { users: organizationMembers }, { user }, { organization } ] = await Promise.all([
        this.userMediatorService.getUsersByOrganizationId({ organizationId }),
        this.userMediatorService.getUser({ userId }),
        this.organizationMediatorService.getOrganization({ organizationId }),
      ]);

      const organizationMemberIds = organizationMembers.map((organizationMember) => organizationMember.id);

      await this.userAddedToOrganizationSnsService.sendMessage({
        organization,
        user,
        role,
        organizationMemberIds,
      });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserAddedToOrganizationDynamoProcessorServiceConfigInterface {
  tableNames: Pick<EnvConfigInterface["tableNames"], "core">;
}
