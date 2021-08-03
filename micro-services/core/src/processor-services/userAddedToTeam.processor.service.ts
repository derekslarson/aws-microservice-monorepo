import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { UserAddedToTeamSnsServiceInterface } from "../sns-services/userAddedToTeam.sns.service";
import { RawTeamUserRelationship } from "../repositories/teamUserRelationship.dynamo.repository";
import { TeamUserRelationshipServiceInterface } from "../entity-services/teamUserRelationship.service";

@injectable()
export class UserAddedToTeamProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserAddedToTeamSnsServiceInterface) private userAddedToTeamSnsService: UserAddedToTeamSnsServiceInterface,
    @inject(TYPES.TeamUserRelationshipServiceInterface) private teamUserRelationshipService: TeamUserRelationshipServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserAddedToTeamProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isTeamUserRelationship = record.newImage.entityType === EntityType.TeamUserRelationship;
      const isCreation = record.eventName === "INSERT";

      return isCoreTable && isTeamUserRelationship && isCreation;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawTeamUserRelationship>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { newImage: { teamId, userId } } = record;

      const { teamUserRelationships } = await this.teamUserRelationshipService.getTeamUserRelationshipsByTeamId({ teamId });

      const teamMemberIds = teamUserRelationships.map((relationship) => relationship.userId);

      await this.userAddedToTeamSnsService.sendMessage({
        teamId,
        userId,
        teamMemberIds,
      });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export type UserAddedToTeamProcessorServiceConfigInterface = Pick<EnvConfigInterface, "tableNames">;
