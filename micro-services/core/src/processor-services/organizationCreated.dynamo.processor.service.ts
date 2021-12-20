import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord } from "@yac/util/src/services/interfaces/dynamo.processor.service.interface";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { OrganizationCreatedSnsServiceInterface } from "../sns-services/organizationCreated.sns.service";
import { RawOrganization } from "../repositories/organization.dynamo.repository";
import { OrganizationServiceInterface } from "../services/tier-1/organization.service";
import { UserServiceInterface } from "../services/tier-1/user.service";

@injectable()
export class OrganizationCreatedDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.OrganizationCreatedSnsServiceInterface) private organizationCreatedSnsService: OrganizationCreatedSnsServiceInterface,
    @inject(TYPES.OrganizationServiceInterface) private organizationService: OrganizationServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: OrganizationCreatedDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isOrganization = record.newImage.entityType === EntityType.Organization;
      const isCreation = record.eventName === "INSERT";

      return isCoreTable && isOrganization && isCreation;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawOrganization>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { newImage: { id: organizationId, createdBy: userId } } = record;

      const [ { organization }, { user } ] = await Promise.all([
        this.organizationService.getOrganization({ organizationId }),
        this.userService.getUser({ userId }),
      ]);

      await this.organizationCreatedSnsService.sendMessage({ organization, organizationMemberIds: [ organization.createdBy ], createdByUser: user });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface OrganizationCreatedDynamoProcessorServiceConfigInterface {
  tableNames: {
    core: EnvConfigInterface["tableNames"]["core"];
  }
}
