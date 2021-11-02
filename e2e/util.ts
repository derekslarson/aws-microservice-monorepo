/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { CognitoIdentityServiceProvider, DynamoDB, S3, SNS, SSM, TranscribeService, SecretsManager } from "aws-sdk";
import crypto from "crypto";
import axios from "axios";
import ksuid from "ksuid";
import jwt from "jsonwebtoken";

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

async function getXsrfToken(): Promise<{ xsrfToken: string }> {
  try {
    const queryParameters = {
      response_type: "code",
      client_id: process.env["yac-client-id"],
      redirect_uri: process.env["yac-client-redirect-uri"],
    };

    const authorizeResponse = await axios.get(`${process.env["user-pool-domain-url"] as string}/oauth2/authorize`, { params: queryParameters });

    const setCookieHeader = (authorizeResponse.headers as Record<string, string[]>)["set-cookie"];

    if (!Array.isArray(setCookieHeader)) {
      throw new Error("Malformed 'set-cookie' header in response.");
    }

    const [ xsrfTokenHeader ] = setCookieHeader.filter((header: string) => header.substring(0, 10) === "XSRF-TOKEN");

    const xsrfToken = xsrfTokenHeader.split(";")[0].split("=")[1];

    return { xsrfToken };
  } catch (error: unknown) {
    console.log("Error in getXsrfToken:\n", error);

    throw error;
  }
}

async function getAuthorizationCode(emailOrId: string, xsrfToken: string, logError?: boolean): Promise<{ authorizationCode: string; }> {
  try {
    const { SecretString: authSecret } = await secretsManager.getSecretValue({ SecretId: process.env["auth-secret-id"] as string }).promise();

    if (!authSecret) {
      throw new Error("Error fetching auth secret");
    }

    const data = `_csrf=${encodeURIComponent(xsrfToken)}&username=${encodeURIComponent(emailOrId)}&password=${encodeURIComponent(authSecret)}`;

    const queryParameters = {
      response_type: "code",
      client_id: process.env["yac-client-id"],
      redirect_uri: process.env["yac-client-redirect-uri"],
    };

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: `XSRF-TOKEN=${xsrfToken}; Path=/; Secure; HttpOnly; SameSite=Lax`,
    };

    const loginResponse = await axios.post(`${process.env["user-pool-domain-url"] as string}/login`, data, {
      params: queryParameters,
      headers,
      validateStatus(status: number) {
        return status >= 200 && status < 600;
      },
      maxRedirects: 0,
    });

    const redirectPath = (loginResponse.headers as Record<string, string>).location;

    if (!redirectPath) {
      throw new Error("redirect path missing in response");
    }

    const authorizationCode = redirectPath.split("code=")[1]?.split("&")[0];

    if (!authorizationCode) {
      throw new Error("Error fetching authorization code");
    }
    return { authorizationCode };
  } catch (error: unknown) {
    if (logError ?? true) {
      console.log("Error in getAuthorizationCode:\n", error);
    }

    throw error;
  }
}

async function getToken(authorizationCode: string): Promise<{ accessToken: string }> {
  try {
    const oauth2AuthorizeBody = `grant_type=authorization_code&code=${authorizationCode}&client_id=${process.env["yac-client-id"] as string}&redirect_uri=${process.env["yac-client-redirect-uri"] as string}`;

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${process.env["yac-client-id"] as string}:${process.env["yac-client-secret"] as string}`).toString("base64")}`,
    };

    const { data } = await axios.post<{ access_token: string; }>(`${process.env["user-pool-domain-url"] as string}/oauth2/token`, oauth2AuthorizeBody, { headers });

    return { accessToken: data.access_token };
  } catch (error: unknown) {
    console.log("Error in getTokens:\n", error);

    throw error;
  }
}

export async function getAccessTokenByEmail(email: string): Promise<{ accessToken: string; }> {
  try {
    const { xsrfToken } = await getXsrfToken();

    const { authorizationCode } = await backoff(
      () => getAuthorizationCode(email, xsrfToken, false),
      (res) => !!res.authorizationCode,
      8000,
      1000,
    );

    const { accessToken } = await getToken(authorizationCode);

    return { accessToken };
  } catch (error) {
    console.log("Error in getAccessTokenByEmail:\n", error);

    throw error;
  }
}

export async function getAccessToken(userId: string): Promise<{ accessToken: string; }> {
  try {
    const { xsrfToken } = await getXsrfToken();

    const { authorizationCode } = await backoff(
      () => getAuthorizationCode(userId, xsrfToken, false),
      (res) => !!res.authorizationCode,
      8000,
      1000,
    );

    const { accessToken } = await getToken(authorizationCode);

    return { accessToken };
  } catch (error) {
    console.log("Error in getAccessTokenByEmail:\n", error);

    throw error;
  }
}

function createUserPoolClientSecretHash(username: string): string {
  const secretHash = crypto.createHmac("SHA256", process.env["yac-client-secret"] as string).update(`${username}${process.env["yac-client-id"] as string}`).digest("base64");

  return secretHash;
}

export async function createRandomCognitoUser(): Promise<{ id: `user-${string}`, email: string }> {
  try {
    const { SecretString: authSecret } = await secretsManager.getSecretValue({ SecretId: process.env["auth-secret-id"] as string }).promise();

    if (!authSecret) {
      throw new Error("Error fetching auth secret");
    }

    const id: `user-${string}` = `user-${ksuid.randomSync().string}`;
    const email = `${generateRandomString(5)}@${generateRandomString(5)}.com`;

    const secretHash = createUserPoolClientSecretHash(id);

    const signUpParams: CognitoIdentityServiceProvider.Types.SignUpRequest = {
      ClientId: process.env["yac-client-id"] as string,
      SecretHash: secretHash,
      Username: id,
      Password: authSecret,
      UserAttributes: [
        {
          Name: "email",
          Value: email,
        },
      ],
    };

    await cognito.signUp(signUpParams).promise();

    return { id, email };
  } catch (error) {
    console.log("Error in createRandomCognitoUser:\n", error);

    throw error;
  }
}

export async function generateMessageUploadToken(conversationId: string, messageId: string, mimeType: string): Promise<string> {
  try {
    const { SecretString: secret } = await secretsManager.getSecretValue({ SecretId: process.env["message-upload-token-secret-id"] as string }).promise();

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

export const ISO_DATE_REGEX = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})[Z]/;

export const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;
