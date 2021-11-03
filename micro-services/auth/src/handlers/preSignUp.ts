/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/require-await */
import "reflect-metadata";
import { PreSignUpTriggerEvent } from "aws-lambda";
import { LoggerServiceInterface } from "@yac/util";
// import { CognitoIdentityServiceProvider } from "aws-sdk";
// import ksuid from "ksuid";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";

// const cognitoIdp = new CognitoIdentityServiceProvider();

// async function getUserByEmail(userPoolId: string, email: string): Promise<CognitoIdentityServiceProvider.UserType | undefined> {
//   const params = {
//     UserPoolId: userPoolId,
//     Filter: `email = "${email}"`,
//   };

//   const { Users = [] } = await cognitoIdp.listUsers(params).promise();

//   return Users[0];
// }

// async function linkProviderToUser(username: string, userPoolId: string, providerName: string, providerUserId: string): Promise<void> {
//   await cognitoIdp.adminLinkProviderForUser({
//     DestinationUser: {
//       ProviderAttributeValue: username,
//       ProviderName: "Cognito",
//     },
//     SourceUser: {
//       ProviderAttributeName: "Cognito_Subject",
//       ProviderAttributeValue: providerUserId,
//       ProviderName: providerName,
//     },
//     UserPoolId: userPoolId,
//   }).promise();
// }

export const handler = async (event: PreSignUpTriggerEvent): Promise<PreSignUpTriggerEvent> => {
  const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

  try {
    loggerService.trace("preSignUp called", { event }, "preSignUp handler");

    if (event.request.userAttributes.email) {
      event.response.autoVerifyEmail = true;
    }

    if (event.request.userAttributes.phone_number) {
      event.response.autoVerifyPhone = true;
    }

    event.response.autoConfirmUser = true;

    // if (event.triggerSource === "PreSignUp_ExternalProvider") {
    //   const existingUser = await getUserByEmail(event.userPoolId, event.request.userAttributes.email);
    //   if (existingUser) {
    //     const [ providerName, providerUserId ] = event.userName.split("_");
    //     await linkProviderToUser(existingUser.Username as string, event.userPoolId, providerName, providerUserId);
    //   }
    // }

    return event;
  } catch (error: unknown) {
    loggerService.error("Catastrophic error in preSignUp handler", { error, event }, "preSignUp handler");

    throw error;
  }
};
