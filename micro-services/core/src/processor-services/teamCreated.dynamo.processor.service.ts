import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { TeamCreatedSnsServiceInterface } from "../sns-services/teamCreated.sns.service";
import { RawTeam } from "../repositories/team.dynamo.repository";
import { TeamMediatorServiceInterface } from "../mediator-services/team.mediator.service";

@injectable()
export class TeamCreatedDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.TeamCreatedSnsServiceInterface) private teamCreatedSnsService: TeamCreatedSnsServiceInterface,
    @inject(TYPES.TeamMediatorServiceInterface) private teamMediatoService: TeamMediatorServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserCreatedDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isTeam = record.newImage.entityType === EntityType.Team;
      const isCreation = record.eventName === "INSERT";

      return isCoreTable && isTeam && isCreation;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawTeam>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { newImage: { id: teamId } } = record;

      const { team } = await this.teamMediatoService.getTeam({ teamId });

      await this.teamCreatedSnsService.sendMessage({ team, teamMemberIds: [ team.createdBy ] });
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
