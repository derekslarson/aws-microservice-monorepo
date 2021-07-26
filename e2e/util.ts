/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { CognitoIdentityServiceProvider, DynamoDB, S3, SSM } from "aws-sdk";
import crypto from "crypto";
import axios from "axios";

const ssm = new SSM({ region: "us-east-1" });
export const s3 = new S3({ region: "us-east-1" });
export const cognito = new CognitoIdentityServiceProvider({ region: "us-east-1" });
export const documentClient = new DynamoDB.DocumentClient({ region: "us-east-1" });

export async function getSsmParameters(environment: string, paramNames: string[]): Promise<Record<string, string>> {
  try {
    if (environment === "prod") {
      throw new Error("Don't run e2e tests in prod");
    }

    const params = await Promise.all(paramNames.map(async (param) => {
      const prefix = "/yac-api-v4";
      let env = environment;

      if (param === "secret" && ![ "dev", "stage" ].includes(environment)) {
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

async function getAuthorizationCode(email: string, xsrfToken: string): Promise<{ authorizationCode: string; }> {
  try {
    const data = `_csrf=${xsrfToken}&username=${email}&password=YAC-${process.env.secret as string}`;

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

    const [ , authorizationCode ] = redirectPath.split("=");

    return { authorizationCode };
  } catch (error: unknown) {
    console.log("Error in getAuthorizationCode:\n", error);

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

    const { authorizationCode } = await getAuthorizationCode(email, xsrfToken);

    const { accessToken } = await getToken(authorizationCode);

    return { accessToken };
  } catch (error) {
    console.log("Error in getAccessTokenByEmail:\n", error);

    throw error;
  }
}

export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(() => resolve(), ms));
}

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

export const ISO_DATE_REGEX = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})[Z]/;

export const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;
