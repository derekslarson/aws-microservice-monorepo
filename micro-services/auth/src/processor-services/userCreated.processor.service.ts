import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface, SnsProcessorServiceInterface, SnsProcessorServiceRecord, UserCreatedSnsMessage } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { ExternalProviderUserMappingServiceInterface } from "../services/externalProviderUserMapping.service";
import { UserPoolServiceInterface } from "../services/userPool.service";

@injectable()
export class UserCreatedProcessorService implements SnsProcessorServiceInterface {
  private userCreatedSnsTopicArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserPoolServiceInterface) private userPoolService: UserPoolServiceInterface,
    @inject(TYPES.ExternalProviderUserMappingServiceInterface) private externalProviderMappingService: ExternalProviderUserMappingServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserCreatedProcessorServiceConfigInterface,
  ) {
    this.userCreatedSnsTopicArn = envConfig.snsTopicArns.userCreated;
  }

  public determineRecordSupport(record: SnsProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.topicArn === this.userCreatedSnsTopicArn;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: SnsProcessorServiceRecord<UserCreatedSnsMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { message: { id, email, phone } } = record;

      await this.userPoolService.createUser({ id, email, phone });

      if (email) {
        const { users } = await this.userPoolService.getUsersByEmail({ email });

        const externalProviderUsers = users.filter((user) => user.UserStatus === "EXTERNAL_PROVIDER");

        await Promise.all<unknown>([
          ...externalProviderUsers.map((externalProviderUser) => this.externalProviderMappingService.createExternalProviderUserMapping({
            externalProviderId: externalProviderUser.Username as string,
            userId: id,
          })),
          ...externalProviderUsers.map((externalProviderUser) => this.userPoolService.addYacUserIdToUser({
            username: externalProviderUser.Username as string,
            yacUserId: id,
          })),
        ]);
      }
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export type UserCreatedProcessorServiceConfigInterface = Pick<EnvConfigInterface, "snsTopicArns">;
