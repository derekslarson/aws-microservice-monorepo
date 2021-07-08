/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { CognitoIdentityServiceProvider, DynamoDB, SSM } from "aws-sdk";
import crypto from "crypto";
import axios from "axios";

const ssm = new SSM({ region: "us-east-1" });
const cognito = new CognitoIdentityServiceProvider({ region: "us-east-1" });
const documentClient = new DynamoDB.DocumentClient({ region: "us-east-1" });

export async function getSsmParameters(environment: string, paramNames: string[]): Promise<Record<string, string>> {
  try {
    const params = await Promise.all(paramNames.map(async (param) => {
      const prefix = "/yac-api-v4";
      let env = environment;

      if (param === "secret" && ![ "dev", "stage", "prod" ].includes(environment)) {
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

function createSecretHash(email: string): string {
  return crypto.createHmac("SHA256", process.env["yac-client-secret"] as string).update(`${email}${process.env["yac-client-id"] as string}`).digest("base64");
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

    const { data: { access_token: accessToken } } = await axios.post<{ access_token: string; }>(`${process.env["user-pool-domain-url"] as string}/oauth2/token`, oauth2AuthorizeBody, { headers });

    return { accessToken };
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

export async function createRandomUser(): Promise<{ id: string; email: string; }> {
  try {
    const email = `${generateRandomString(8)}@${generateRandomString(8)}.com`;

    const { UserSub } = await cognito.signUp({
      ClientId: process.env["yac-client-id"] as string,
      SecretHash: createSecretHash(email),
      Username: email,
      Password: `YAC-${process.env.secret as string}`,
    }).promise();

    return { id: `user-${UserSub}`, email };
  } catch (error) {
    console.log("Error in createRandomUser:\n", error);

    throw error;
  }
}

export async function deleteUser(id: string): Promise<void> {
  if (!id.startsWith("user-")) {
    throw new Error("must be a valid user id");
  }

  try {
    const { Item } = await documentClient.get({
      TableName: process.env["core-table-name"] as string,
      Key: { pk: id, sk: id },
    }).promise();

    if (Item) {
      await Promise.all([
        cognito.adminDeleteUser({
          UserPoolId: process.env["user-pool-id"] as string,
          Username: (Item as Record<string, string>).email,
        }).promise(),
        documentClient.delete({
          TableName: process.env["core-table-name"] as string,
          Key: { pk: id, sk: id },
        }).promise(),
      ]);
    }
  } catch (error) {
    console.log("Error in deleteUser:\n", error);

    throw error;
  }
}
