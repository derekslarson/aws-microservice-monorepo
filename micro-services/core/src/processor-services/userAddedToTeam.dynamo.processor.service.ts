import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord } from "@yac/util/src/services/interfaces/dynamo.processor.service.interface";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { TeamId } from "@yac/util/src/types/teamId.type";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { UserAddedToTeamSnsServiceInterface } from "../sns-services/userAddedToTeam.sns.service";
import { RawMembership } from "../repositories/membership.dynamo.repository";
import { MembershipType } from "../enums/membershipType.enum";
import { TeamServiceInterface } from "../services/tier-1/team.service";
import { UserServiceInterface } from "../services/tier-1/user.service";

@injectable()
export class UserAddedToTeamDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserAddedToTeamSnsServiceInterface) private userAddedToTeamSnsService: UserAddedToTeamSnsServiceInterface,
    @inject(TYPES.TeamServiceInterface) private teamService: TeamServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserAddedToTeamDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isMembership = record.newImage.entityType === EntityType.Membership;
      const isTeamMembership = (record.newImage as RawMembership).type === MembershipType.Team;
      const isCreation = record.eventName === "INSERT";

      return isCoreTable && isMembership && isTeamMembership && isCreation;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawMembership>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { newImage: { entityId, userId } } = record;
      const teamId = entityId as TeamId;

      const [ { users: teamMembers }, { user }, { team } ] = await Promise.all([
        this.userService.getUsersByEntityId({ entityId: teamId }),
        this.userService.getUser({ userId }),
        this.teamService.getTeam({ teamId }),
      ]);

      const teamMemberIds = teamMembers.map((teamMember) => teamMember.id);

      await this.userAddedToTeamSnsService.sendMessage({
        team,
        user,
        teamMemberIds,
      });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserAddedToTeamDynamoProcessorServiceConfigInterface {
  tableNames: Pick<EnvConfigInterface["tableNames"], "core">;
}
