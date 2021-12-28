/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { CloudFormation, CognitoIdentityServiceProvider, DynamoDB, S3, SNS, SSM, TranscribeService, SecretsManager } from "aws-sdk";
import crypto from "crypto";
import ksuid from "ksuid";
import jwt from "jsonwebtoken";
import * as jose from "node-jose";
import { MakeRequired } from "@yac/util/src/types/makeRequired.type";
import { UserId } from "@yac/util/src/types/userId.type";
import { RawUser } from "@yac/auth/src/repositories/user.dynamo.repository";
import { RawSession } from "@yac/auth/src/repositories/session.dynamo.repository";
import { EntityType } from "../microservices/auth/src/enums/entityType.enum";
import { AccessTokenPayload } from "../microservices/auth/src/services/tier-1/token.service";

const cloudFormation = new CloudFormation({ region: "us-east-1" });

const ssm = new SSM({ region: "us-east-1" });
export const s3 = new S3({ region: "us-east-1" });
export const sns = new SNS({ region: "us-east-1" });
export const cognito = new CognitoIdentityServiceProvider({ region: "us-east-1" });
export const documentClient = new DynamoDB.DocumentClient({ region: "us-east-1" });
export const transcribe = new TranscribeService({ region: "us-east-1" });
export const secretsManager = new SecretsManager({ region: "us-east-1" });

export async function backoff<T>(func: (...args: unknown[]) => Promise<T>, successFunc: (res: T) => boolean, maxBackoff = 4000, currentBackoff = 500): Promise<T> {
  try {
    const response = await func();

    if (successFunc(response)) {
      return response;
    }

    throw new Error("Success func failed");
  } catch (error) {
    if (currentBackoff <= maxBackoff) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(backoff(func, successFunc, maxBackoff, currentBackoff * 2));
        }, currentBackoff);
      });
    }

    console.log(`${new Date().toISOString()} : Error in backoff. maxBackoff of ${maxBackoff}ms already reached.\n`, error);

    throw error;
  }
}

export async function getSsmParameters(environment: string, paramNames: string[]): Promise<Record<string, string>> {
  try {
    if (environment === "prod") {
      throw new Error("Don't run e2e tests in prod");
    }

    const params = await Promise.all(paramNames.map(async (param) => {
      const prefix = "/yac-api-v4";
      let env = environment;

      if (param === "gcm-sender-id" && ![ "dev", "stage" ].includes(environment)) {
        env = "dev";
      }

      try {
        const { Parameter } = await ssm.getParameter({ Name: `${prefix}/${env}/${param}` }).promise();

        return Parameter || {};
      } catch (error) {
        console.log(`Error fetching ${prefix}/${env}/${param}:\n`, error);

        return {};
      }
    }));

    const paramObj = params.reduce((acc: Record<string, string>, param) => {
      const [ , , , key ] = param.Name?.split("/") || [];
      const val = param.Value;

      if (key && val) {
        acc[key] = val;
      }

      return acc;
    }, {});

    return paramObj;
  } catch (error) {
    console.log("Error in getSsmParameters:\n", error);

    throw error;
  }
}

export function setEnvVars(vars: Record<string, string>): void {
  try {
    Object.entries(vars).forEach(([ key, val ]) => {
      process.env[key] = val;
    });
  } catch (error) {
    console.log("Error in getSsmParameters:\n", error);

    throw error;
  }
}

export function generateRandomString(length = 8): string {
  return crypto.randomBytes(length / 2).toString("hex");
}

export async function getAccessToken(userId: UserId): Promise<{ accessToken: string; }> {
  try {
    const scope = [
      "openid",
      "email",
      "profile",
      "yac/user.read",
      "yac/user.write",
      "yac/user.delete",
      "yac/friend.read",
      "yac/friend.write",
      "yac/friend.delete",
      "yac/team.read",
      "yac/team.write",
      "yac/team.delete",
      "yac/team_member.read",
      "yac/team_member.write",
      "yac/team_member.delete",
      "yac/group.read",
      "yac/group.write",
      "yac/group.delete",
      "yac/group_member.read",
      "yac/group_member.write",
      "yac/group_member.delete",
      "yac/meeting.read",
      "yac/meeting.write",
      "yac/meeting.delete",
      "yac/meeting_member.read",
      "yac/meeting_member.write",
      "yac/meeting_member.delete",
      "yac/message.read",
      "yac/message.write",
      "yac/message.delete",
      "yac/conversation.read",
      "yac/conversation.write",
      "yac/conversation.delete",
    ].join(" ");

    const { Item: jwks } = await documentClient.get({
      TableName: process.env["auth-table-name"] as string,
      Key: { pk: EntityType.Jwks, sk: EntityType.Jwks },
    }).promise();

    if (!jwks) {
      throw new Error("Jwks not found.");
    }

    const clientId = ksuid.randomSync().string;
    const sessionId = ksuid.randomSync().string;

    const jwksJson = JSON.parse(jwks.jsonString) as { keys: unknown[]; };

    // Reverse array to ensure usage of the most recent key
    jwksJson.keys.reverse();

    const keyStore = await jose.JWK.asKeyStore(jwksJson);

    const key = await jose.JWK.asKey(keyStore.all({ use: "sig" })[0]);

    const nowSeconds = Math.round(Date.now().valueOf() / 1000);
    const expiresInSeconds = 60 * 30;

    const payload: AccessTokenPayload = {
      sid: sessionId,
      cid: clientId,
      iss: "https://test.com",
      sub: userId,
      scope,
      nbf: nowSeconds,
      iat: nowSeconds,
      exp: nowSeconds + expiresInSeconds,
      jti: ksuid.randomSync().string,
    };

    const accessToken = await jose.JWS.createSign({ compact: true, fields: { typ: "jwt" } }, key)
      .update(JSON.stringify(payload))
      .final() as unknown as string;

    const refreshToken = `${ksuid.randomSync().string}${ksuid.randomSync().string}${ksuid.randomSync().string}`;

    const nowIso = new Date().toISOString();
    const oneHundredEightyDaysFromNowIso = new Date(Date.now() + (1000 * 60 * 60 * 24 * 180)).toISOString();

    const session: RawSession = {
      entityType: EntityType.Session,
      pk: clientId,
      sk: `${EntityType.Session}-${sessionId}`,
      gsi1pk: clientId,
      gsi1sk: `${EntityType.Session}-${refreshToken}`,
      clientId,
      sessionId,
      refreshToken,
      createdAt: nowIso,
      refreshTokenCreatedAt: nowIso,
      refreshTokenExpiresAt: oneHundredEightyDaysFromNowIso,
      userId,
      scope,
    };

    await documentClient.put({
      TableName: process.env["auth-table-name"] as string,
      Item: session,
    }).promise();

    return { accessToken };
  } catch (error) {
    console.log("Error in getAccessTokenByEmail:\n", error);

    throw error;
  }
}

export async function getAccessTokenByEmail(email: string): Promise<{ accessToken: string; }> {
  try {
    const { Item: uniqueEmail } = await documentClient.get({
      TableName: process.env["auth-table-name"] as string,
      Key: { pk: email, sk: EntityType.UserUniqueEmail },
    }).promise();

    if (!uniqueEmail) {
      throw new Error("User not found.");
    }

    const { userId } = uniqueEmail as { userId: UserId; };

    const { Item: user } = await documentClient.get({
      TableName: process.env["auth-table-name"] as string,
      Key: { pk: userId, sk: EntityType.User },
    }).promise();

    if (!user) {
      throw new Error("User not found.");
    }

    const { accessToken } = await getAccessToken((user as RawUser).id);

    return { accessToken };
  } catch (error) {
    console.log("Error in getAccessTokenByEmail:\n", error);

    throw error;
  }
}

export async function createAuthServiceUser(params: CreateUserInput): Promise<{ user: MakeRequired<RawUser, "email">; }> {
  try {
    const { name, username, email, phone } = params;

    const id: `user_${string}` = `user_${ksuid.randomSync().string}`;

    const userEntity: RawUser = {
      entityType: EntityType.User,
      pk: id,
      sk: EntityType.User,
      createdAt: new Date().toISOString(),
      id,
      email,
      name,
      username,
      phone,
    };

    const transactWriteInput: DynamoDB.DocumentClient.TransactWriteItemsInput = {
      TransactItems: [
        {
          Put: {
            TableName: process.env["auth-table-name"] as string,
            ConditionExpression: "attribute_not_exists(pk)",
            Item: userEntity,
          },
        },
        {
          Put: {
            TableName: process.env["auth-table-name"] as string,
            ConditionExpression: "attribute_not_exists(pk)",
            Item: {
              entityType: EntityType.UserUniqueEmail,
              pk: email,
              sk: EntityType.UserUniqueEmail,
              userId: id,
              email,
            },
          },
        },
      ],
    };

    if (username) {
      transactWriteInput.TransactItems.push({
        Put: {
          TableName: process.env["auth-table-name"] as string,
          ConditionExpression: "attribute_not_exists(pk)",
          Item: {
            entityType: EntityType.UserUniqueUsername,
            pk: username,
            sk: EntityType.UserUniqueUsername,
            userId: id,
            username,
          },
        },
      });
    }

    if (phone) {
      transactWriteInput.TransactItems.push({
        Put: {
          TableName: process.env["auth-table-name"] as string,
          ConditionExpression: "attribute_not_exists(pk)",
          Item: {
            entityType: EntityType.UserUniquePhone,
            pk: phone,
            sk: EntityType.UserUniquePhone,
            userId: id,
            phone,
          },
        },
      });
    }

    await documentClient.transactWrite(transactWriteInput).promise();

    return { user: userEntity as MakeRequired<RawUser, "email"> };
  } catch (error) {
    console.log("Error in createRandomAuthServiceUser:\n", error);

    throw error;
  }
}

export async function createRandomAuthServiceUser(): Promise<CreateRandomAuthServiceUserOutput> {
  try {
    const name = generateRandomString();

    let user: MakeRequired<RawUser, "email"> | undefined;
    let attempts = 1;

    while (!user && attempts < 6) {
      const email = `${generateRandomString()}@${generateRandomString()}.com`;

      try {
        ({ user } = await createAuthServiceUser({ name, email }));
      } catch (error) {
        attempts += 1;
      }
    }

    if (!user) {
      throw new Error("Failed to create a random user");
    }

    return user;
  } catch (error) {
    console.log("Error in createRandomAuthServiceUser:\n", error);

    throw error;
  }
}

export async function generateMessageUploadToken(conversationId: string, messageId: string, mimeType: string): Promise<string> {
  try {
    const { SecretString: secret } = await secretsManager.getSecretValue({ SecretId: "arn:aws:secretsmanager:us-east-1:644653163171:secret:MessageUploadTokenSecretalp-ZQietCk5R0Zp-n1ksFD" }).promise();

    if (!secret) {
      throw new Error("Error fetching secret");
    }

    const token = jwt.sign({ conversationId, messageId, mimeType }, secret, { expiresIn: 7200 });

    return token;
  } catch (error: unknown) {
    console.log("Error in generateMessageUploadToken:\n", error);

    throw error;
  }
}

export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(() => resolve(), ms));
}

export async function getExportsByEnvironment(environment: string, nextToken?: string, prevExports?: Record<string, string>): Promise<Record<string, string>> {
  const { Exports = [], NextToken } = await cloudFormation.listExports({ NextToken: nextToken }).promise();

  const exports: Record<string, string> = prevExports || {};

  Exports.forEach((exp) => {
    if (exp.Name?.startsWith(environment) && exp.Value) {
      exports[exp.Name] = exp.Value;
    }
  });

  if (NextToken) {
    return getExportsByEnvironment(environment, NextToken, exports);
  }

  return exports;
}

export const ISO_DATE_REGEX = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})[Z]/;

export const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

export interface CreateUserInput {
  email: string;
  name: string;
  username?: string;
  phone?: string;
}

export type CreateRandomAuthServiceUserOutput = MakeRequired<RawUser, "email">;
