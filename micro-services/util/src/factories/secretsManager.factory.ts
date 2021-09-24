/* eslint-disable @typescript-eslint/no-floating-promises */
import { SecretsManager } from "aws-sdk";

export type SecretsManagerFactory = () => SecretsManager;

export const secretsManagerFactory: SecretsManagerFactory = () => new SecretsManager();
