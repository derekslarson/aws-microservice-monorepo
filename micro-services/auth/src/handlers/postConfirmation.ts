/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/require-await */
import "reflect-metadata";
import { PostConfirmationTriggerEvent } from "aws-lambda";
import { LoggerServiceInterface, UserId } from "@yac/util";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { ExternalProviderUserMappingServiceInterface } from "../services/externalProviderUserMapping.service";
import { ExternalProviderUserSignedUpSnsServiceInterface } from "../sns-services/externalProviderUserSignedUp.sns.service";
import { UserPoolServiceInterface } from "../services/userPool.service";

const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);
const userPoolService = container.get<UserPoolServiceInterface>(TYPES.UserPoolServiceInterface);
const externalProviderUserMappingService = container.get<ExternalProviderUserMappingServiceInterface>(TYPES.ExternalProviderUserMappingServiceInterface);
const externalProviderUserSignedUpSnsService = container.get<ExternalProviderUserSignedUpSnsServiceInterface>(TYPES.ExternalProviderUserSignedUpSnsServiceInterface);

export const handler = async (event: PostConfirmationTriggerEvent): Promise<PostConfirmationTriggerEvent> => {
  try {
    loggerService.trace("postConfirmation called", { event }, "postConfirmation handler");

    if (event.request.userAttributes["cognito:user_status"] === "EXTERNAL_PROVIDER" && event.request.userAttributes.email) {
      // Since this lambda was deployed before the user pool existed, this wasn't set via env vars, so we need to set it now
      userPoolService.userPoolId = event.userPoolId;

      const { users } = await userPoolService.getUsersByEmail({ email: event.request.userAttributes.email });

      const [ normalUser ] = users.filter((user) => user.UserStatus === "CONFIRMED");

      if (normalUser) {
        await externalProviderUserMappingService.createExternalProviderUserMapping({ externalProviderId: event.userName, userId: normalUser.Username as UserId });
      } else {
        await externalProviderUserSignedUpSnsService.sendMessage({ email: event.request.userAttributes.email });
      }
    }

    return event;
  } catch (error: unknown) {
    loggerService.error("Catastrophic error in postConfirmation handler", { error, event }, "postConfirmation handler");

    throw error;
  }
};
