import { CognitoIdentityServiceProvider } from "aws-sdk";

export type CognitoFactory = () => CognitoIdentityServiceProvider;

export const cognitoFactory: CognitoFactory = () => new CognitoIdentityServiceProvider();
