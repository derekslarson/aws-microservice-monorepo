// import "reflect-metadata";
// import { injectable, inject } from "inversify";
// import { LoggerServiceInterface } from "./logger.service";

// import { EnvConfigInterface } from "../config/env.config";
// import { TYPES } from "../inversion-of-control/types";
// import { BaseSnsService } from "./base.sns.service";
// import { SnsFactory } from "../factories/sns.factory";
// import { UserSignedUpSnsMessage } from "../api-contracts/sns.topics";

// @injectable()
// export class UserSignedUpSnsService extends BaseSnsService<UserSignedUpSnsMessage> implements UserSignedUpSnsServiceInterface {
//   constructor(
//   @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
//     @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
//     @inject(TYPES.EnvConfigInterface) envConfig: UserSignedUpSnsServiceConfigInterface,
//   ) {
//     super(envConfig.snsTopicArns.userSignedUp as string, loggerService, snsFactory);
//   }

//   public async sendMessage(message: UserSignedUpSnsMessage): Promise<void> {
//     try {
//       this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

//       await this.publish(message);
//     } catch (error: unknown) {
//       this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

//       throw error;
//     }
//   }
// }

// export interface UserSignedUpSnsServiceInterface {
//   sendMessage(message: UserSignedUpSnsMessage): Promise<void>;
// }

// export type UserSignedUpSnsServiceConfigInterface = Pick<EnvConfigInterface, "snsTopicArns">;
