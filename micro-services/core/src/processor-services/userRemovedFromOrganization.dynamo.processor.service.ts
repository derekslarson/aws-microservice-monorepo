import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { UserRemovedFromOrganizationSnsServiceInterface } from "../sns-services/userRemovedFromOrganization.sns.service";
import { RawOrganizationUserRelationship } from "../repositories/organizationUserRelationship.dynamo.repository";
import { OrganizationMediatorServiceInterface } from "../mediator-services/organization.mediator.service";
import { UserMediatorServiceInterface } from "../mediator-services/user.mediator.service";

@injectable()
export class UserRemovedFromOrganizationDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserRemovedFromOrganizationSnsServiceInterface) private userRemovedFromOrganizationSnsService: UserRemovedFromOrganizationSnsServiceInterface,
    @inject(TYPES.OrganizationMediatorServiceInterface) private organizationMediatorService: OrganizationMediatorServiceInterface,
    @inject(TYPES.UserMediatorServiceInterface) private userMediatorService: UserMediatorServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserRemovedFromOrganizationDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isOrganizationUserRelationship = record.oldImage.entityType === EntityType.OrganizationUserRelationship;
      const isRemoval = record.eventName === "REMOVE";

      return isCoreTable && isOrganizationUserRelationship && isRemoval;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawOrganizationUserRelationship>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { oldImage: { organizationId, userId } } = record;

      const [ { users: organizationMembers }, { user }, { organization } ] = await Promise.all([
        this.userMediatorService.getUsersByOrganizationId({ organizationId }),
        this.userMediatorService.getUser({ userId }),
        this.organizationMediatorService.getOrganization({ organizationId }),
      ]);

      const organizationMemberIds = organizationMembers.map((organizationMember) => organizationMember.id);

      await this.userRemovedFromOrganizationSnsService.sendMessage({ organization, user, organizationMemberIds });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserRemovedFromOrganizationDynamoProcessorServiceConfigInterface {
  tableNames: Pick<EnvConfigInterface["tableNames"], "core">;
}
