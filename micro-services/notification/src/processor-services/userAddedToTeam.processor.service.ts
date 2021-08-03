import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface, SnsProcessorServiceInterface, SnsProcessorServiceRecord, UserAddedToTeamSnsMessage } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { WebSocketMediatorServiceInterface } from "../mediator-services/webSocket.mediator.service";
import { UserId } from "../types/userId.type";

@injectable()
export class UserAddedToTeamProcessorService implements SnsProcessorServiceInterface {
  private userAddedToTeamSnsTopicArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.WebSocketMediatorServiceInterface) private webSocketMediatorService: WebSocketMediatorServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserAddedToTeamProcessorServiceConfigInterface,
  ) {
    this.userAddedToTeamSnsTopicArn = envConfig.snsTopicArns.userAddedToTeam;
  }

  public determineRecordSupport(record: SnsProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.topicArn === this.userAddedToTeamSnsTopicArn;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: SnsProcessorServiceRecord<UserAddedToTeamSnsMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { message: { teamId, userId, teamMemberIds } } = record;

      const nestedConnectionIdArrays = await Promise.all(teamMemberIds.map(async (teamMemberId) => {
        const { connectionIds } = await this.webSocketMediatorService.getConnectionIdsByUserId({ userId: teamMemberId as UserId });

        return connectionIds;
      }));

      const connectionIds = nestedConnectionIdArrays.reduce((acc, connectionIdArray) => {
        acc.push(...connectionIdArray);

        return acc;
      }, []);

      await Promise.all(connectionIds.map((connectionId) => this.webSocketMediatorService.sendUserAddedToTeamMessage({ connectionId, teamId, userId })));
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export type UserAddedToTeamProcessorServiceConfigInterface = Pick<EnvConfigInterface, "snsTopicArns">;
