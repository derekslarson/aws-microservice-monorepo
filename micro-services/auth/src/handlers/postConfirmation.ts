/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/require-await */
import "reflect-metadata";
import { PostConfirmationTriggerEvent } from "aws-lambda";
import { LoggerServiceInterface, UserId } from "@yac/util";
import { CognitoIdentityServiceProvider } from "aws-sdk";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { ExternalProviderUserMappingServiceInterface } from "../services/externalProviderUserMapping.service";
import { ExternalProviderUserSignedUpSnsServiceInterface } from "../sns-services/externalProviderUserSignedUp.sns.service";

const cognito = new CognitoIdentityServiceProvider({});

export const handler = async (event: PostConfirmationTriggerEvent): Promise<PostConfirmationTriggerEvent> => {
  const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);
  const externalProviderUserMappingService = container.get<ExternalProviderUserMappingServiceInterface>(TYPES.ExternalProviderUserMappingServiceInterface);
  const externalProviderUserSignedUpSnsService = container.get<ExternalProviderUserSignedUpSnsServiceInterface>(TYPES.ExternalProviderUserSignedUpSnsServiceInterface);

  try {
    loggerService.trace("postConfirmation called", { event }, "postConfirmation handler");

    if (event.request.userAttributes["cognito:user_status"] === "EXTERNAL_PROVIDER" && event.request.userAttributes.email) {
      const { Users = [] } = await cognito.listUsers({
        UserPoolId: event.userPoolId,
        Filter: `email = "${event.request.userAttributes.email}"`,
      }).promise();

      const [ normalUser ] = Users.filter((user) => user.UserStatus === "CONFIRMED");

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
