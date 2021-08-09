import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface, SnsProcessorServiceInterface, SnsProcessorServiceRecord, UserAddedToTeamSnsMessage } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { WebSocketMediatorServiceInterface } from "../mediator-services/webSocket.mediator.service";
import { WebSocketEvent } from "../enums/webSocket.event.enum";

@injectable()
export class UserAddedToTeamSnsProcessorService implements SnsProcessorServiceInterface {
  private userAddedToTeamSnsTopicArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.WebSocketMediatorServiceInterface) private webSocketMediatorService: WebSocketMediatorServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserAddedToTeamSnsProcessorServiceConfigInterface,
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

      const { message: { team, user, teamMemberIds } } = record;

      await Promise.all(teamMemberIds.map((teamMemberId) => this.webSocketMediatorService.sendMessage({
        userId: teamMemberId,
        event: WebSocketEvent.UserAddedToTeam,
        data: { team, user },
      })));

      // add support for push notifications
      // add support for http integrations
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export type UserAddedToTeamSnsProcessorServiceConfigInterface = Pick<EnvConfigInterface, "snsTopicArns">;
