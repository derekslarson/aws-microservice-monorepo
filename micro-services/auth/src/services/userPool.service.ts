import "reflect-metadata";
import { injectable, inject } from "inversify";
import { AWSError, CognitoIdentityServiceProvider, SecretsManager } from "aws-sdk";
import { BadRequestError, Crypto, CryptoFactory, HttpRequestServiceInterface, LoggerServiceInterface, SecretsManagerFactory, UserId } from "@yac/util";
import { UserType } from "aws-sdk/clients/cognitoidentityserviceprovider";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { CognitoFactory } from "../factories/cognito.factory";

@injectable()
export class UserPoolService implements UserPoolServiceInterface {
  private cognito: CognitoIdentityServiceProvider;

  private crypto: Crypto;

  private secretsManager: SecretsManager;

  private authSecretId: string;

  // The params below may not get set from the config file, due to this class being used in the user pool trigger lambdas,
  // which are deployed before the user pool exists.
  // userPoolId is set manually in the one lambda that does use this currently.
  private yacClientId?: string;

  private yacClientSecret?: string;

  private userPoolDomain?: string;

  public userPoolId?: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.HttpRequestServiceInterface) private httpRequestService: HttpRequestServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: UserPoolServiceConfigInterface,
    @inject(TYPES.CognitoFactory) cognitoFactory: CognitoFactory,
    @inject(TYPES.CryptoFactory) cryptoFactory: CryptoFactory,
    @inject(TYPES.SecretsManagerFactory) secretsManagerFactory: SecretsManagerFactory,
  ) {
    this.cognito = cognitoFactory();
    this.crypto = cryptoFactory();
    this.secretsManager = secretsManagerFactory();

    this.authSecretId = config.authSecretId;
    this.yacClientId = config.userPool.yacClientId;
    this.yacClientSecret = config.userPool.yacClientSecret;
    this.userPoolId = config.userPool.id;
    this.userPoolDomain = config.userPool.domain;
  }

  public async createUser(params: CreateUserInput): Promise<CreateUserOutput> {
    try {
      this.loggerService.trace("createUser called", { params }, this.constructor.name);

      const { id, email, phone } = params;

      if (!this.yacClientId) {
        throw new BadRequestError("yacClientId not set");
      }

      const { SecretString: authSecret } = await this.secretsManager.getSecretValue({ SecretId: this.authSecretId }).promise();

      if (!authSecret) {
        throw new Error("Error fetching auth secret");
      }

      const { userPoolClientSecretHash } = this.createUserPoolClientSecretHash({ username: id });

      const signUpParams: CognitoIdentityServiceProvider.Types.SignUpRequest = {
        ClientId: this.yacClientId,
        SecretHash: userPoolClientSecretHash,
        Username: id,
        Password: authSecret,
        UserAttributes: [
          {
            Name: "custom:yacUserId",
            Value: id,
          },
        ],
      };

      if (email) {
        signUpParams.UserAttributes?.push({
          Name: "email",
          Value: email,
        },);
      }

      if (phone) {
        signUpParams.UserAttributes?.push({
          Name: "phone_number",
          Value: phone,
        },);
      }

      await this.cognito.signUp(signUpParams).promise();
    } catch (error: unknown) {
      if (this.isAwsError(error) && error.code === "UsernameExistsException") {
        throw new BadRequestError(error.message);
      }

      this.loggerService.error("Error in createUser", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addYacUserIdToUser(params: AddYacUserIdToUserInput): Promise<AddYacUserIdToUserOutput> {
    try {
      this.loggerService.trace("addYacUserIdToUser called", { params }, this.constructor.name);

      const { yacUserId, username } = params;

      if (!this.userPoolId) {
        throw new BadRequestError("userPoolId not set");
      }

      const updateUserAttributesParams: CognitoIdentityServiceProvider.Types.AdminUpdateUserAttributesRequest = {
        UserPoolId: this.userPoolId,
        Username: username,
        UserAttributes: [
          {
            Name: "custom:yacUserId",
            Value: yacUserId,
          },
        ],
      };

      await this.cognito.adminUpdateUserAttributes(updateUserAttributesParams).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in addYacUserIdToUser", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getUsersByEmail(params: GetUsersByEmailInput): Promise<GetUsersByEmailOutput> {
    try {
      this.loggerService.trace("getUsersByEmail called", { params }, this.constructor.name);

      const { email } = params;

      if (!this.userPoolId) {
        throw new BadRequestError("userPoolId not set");
      }

      const { Users = [] } = await this.cognito.listUsers({
        UserPoolId: this.userPoolId,
        Filter: `email = "${email}"`,
      }).promise();

      return { users: Users };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByEmail", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async initiateCustomAuthFlow(params: InitiateCustomAuthFlowInput): Promise<InitiateCustomAuthFlowOutput> {
    try {
      this.loggerService.trace("initiateCustomAuthFlow called", { params }, this.constructor.name);

      const { username, confirmationCode } = params;

      if (!this.userPoolId) {
        throw new BadRequestError("userPoolId not set");
      }

      if (!this.yacClientId) {
        throw new BadRequestError("yacClientId not set");
      }

      const authChallenge = `${confirmationCode},${Math.round((new Date()).valueOf() / 1000)}`;

      await this.cognito.adminUpdateUserAttributes({
        UserAttributes: [
          {
            Name: "custom:authChallenge",
            Value: authChallenge,
          },
        ],
        UserPoolId: this.userPoolId,
        Username: username,
      }).promise();

      const { userPoolClientSecretHash } = this.createUserPoolClientSecretHash({ username });

      const initiateAuthParams: CognitoIdentityServiceProvider.Types.AdminInitiateAuthRequest = {
        UserPoolId: this.userPoolId,
        ClientId: this.yacClientId,
        AuthFlow: "CUSTOM_AUTH",
        AuthParameters: {
          USERNAME: username,
          SECRET_HASH: userPoolClientSecretHash,
        },
      };

      const { Session } = await this.cognito.adminInitiateAuth(initiateAuthParams).promise();

      if (!Session) {
        throw new Error("No session returned from initiateAuth.");
      }

      return { session: Session };
    } catch (error: unknown) {
      this.loggerService.error("Error in initiateCustomAuthFlow", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async completeCustomAuthFlow(params: CompleteCustomAuthFlowInput): Promise<CompleteCustomAuthFlowOutput> {
    try {
      this.loggerService.trace("completeCustomAuthFlow called", { params }, this.constructor.name);

      const { username, confirmationCode, session } = params;

      if (!this.userPoolId) {
        throw new BadRequestError("userPoolId not set");
      }

      if (!this.yacClientId) {
        throw new BadRequestError("yacClientId not set");
      }

      const { userPoolClientSecretHash } = this.createUserPoolClientSecretHash({ username });

      const respondToAuthChallengeParams: CognitoIdentityServiceProvider.Types.AdminRespondToAuthChallengeRequest = {
        UserPoolId: this.userPoolId,
        ClientId: this.yacClientId,
        Session: session,
        ChallengeName: "CUSTOM_CHALLENGE",
        ChallengeResponses: {
          USERNAME: username,
          ANSWER: confirmationCode,
          SECRET_HASH: userPoolClientSecretHash,
        },
      };

      const { AuthenticationResult, Session } = await this.cognito.adminRespondToAuthChallenge(respondToAuthChallengeParams).promise();

      if (!AuthenticationResult) {
        return { success: false, session: Session as string };
      }

      return { success: true };
    } catch (error: unknown) {
      this.loggerService.error("Error in completeCustomAuthFlow", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async completeOAuth2AuthFlow(params: CompleteOAuth2AuthFlowInput): Promise<CompleteOAuth2AuthFlowOutput> {
    try {
      this.loggerService.trace("completeOAuth2AuthFlow called", { params }, this.constructor.name);

      const { username, clientId, redirectUri, xsrfToken, state, codeChallenge, codeChallengeMethod, scope } = params;

      if (!this.userPoolId) {
        throw new BadRequestError("userPoolId not set");
      }

      if (!this.yacClientId) {
        throw new BadRequestError("yacClientId not set");
      }

      if (!this.userPoolDomain) {
        throw new BadRequestError("userPoolDomain not set");
      }

      const { SecretString: authSecret } = await this.secretsManager.getSecretValue({ SecretId: this.authSecretId }).promise();

      if (!authSecret) {
        throw new Error("Error fetching auth secret");
      }

      const data = `_csrf=${encodeURIComponent(xsrfToken)}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(authSecret)}`;

      const queryParameters = {
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        ...(state && { state }),
        ...(codeChallenge && { code_challenge: codeChallenge }),
        ...(codeChallengeMethod && { code_challenge_method: codeChallengeMethod }),
        ...(scope && { scope }),
      };

      const headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: `XSRF-TOKEN=${xsrfToken}; Path=/; Secure; HttpOnly; SameSite=Lax`,
      };

      const loginResponse = await this.httpRequestService.post(`${this.userPoolDomain}/login`, data, queryParameters, headers, {
        validateStatus(status: number) {
          return status >= 200 && status < 600;
        },
        maxRedirects: 0,
      });

      const redirectPath = loginResponse.redirect?.path;

      if (!redirectPath) {
        throw new Error("redirect path missing in response");
      }

      const authorizationCode = redirectPath.split("code=")[1]?.split("&")[0];

      if (!authorizationCode) {
        throw new Error("authorizationCode missing in response");
      }

      return { authorizationCode };
    } catch (error: unknown) {
      this.loggerService.error("Error in completeOAuth2AuthFlow", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private createUserPoolClientSecretHash(params: CreateUserPoolClientSecretHashInput): CreateUserPoolClientSecretHashOutput {
    try {
      this.loggerService.trace("createUserPoolClientSecretHash called", { params }, this.constructor.name);

      const { username } = params;

      if (!this.yacClientId) {
        throw new BadRequestError("yacClientId not set");
      }

      if (!this.yacClientSecret) {
        throw new BadRequestError("yacClientSecret not set");
      }

      const userPoolClientSecretHash = this.crypto.createHmac("SHA256", this.yacClientSecret).update(`${username}${this.yacClientId}`).digest("base64");

      return { userPoolClientSecretHash };
    } catch (error: unknown) {
      this.loggerService.error("Error in createUserPoolClientSecretHash", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private isAwsError(error: unknown): error is AWSError {
    return (error as AWSError)?.code !== undefined;
  }
}

export type UserPoolServiceConfigInterface = Pick<EnvConfigInterface, "apiDomain" | "authSecretId"> & {
  userPool: Partial<EnvConfigInterface["userPool"]>;
};

export interface UserPoolServiceInterface {
  userPoolId?: string;
  createUser(params: CreateUserInput): Promise<CreateUserOutput>;
  addYacUserIdToUser(params: AddYacUserIdToUserInput): Promise<AddYacUserIdToUserOutput>;
  getUsersByEmail(params: GetUsersByEmailInput): Promise<GetUsersByEmailOutput>;
  initiateCustomAuthFlow(params: InitiateCustomAuthFlowInput): Promise<InitiateCustomAuthFlowOutput>;
  completeCustomAuthFlow(params: CompleteCustomAuthFlowInput): Promise<CompleteCustomAuthFlowOutput>;
  completeOAuth2AuthFlow(params: CompleteOAuth2AuthFlowInput): Promise<CompleteOAuth2AuthFlowOutput>
}

export interface CreateUserInput {
  id: string;
  email?: string;
  phone?: string;
}

export type CreateUserOutput = void;

export interface AddYacUserIdToUserInput {
  yacUserId: UserId;
  username: string;
}

export type AddYacUserIdToUserOutput = void;

export interface UpdateUserInput {
  username: string;
  authChallenge?: string;
}

export type UpdateUserOutput = void;

export interface GetUsersByEmailInput {
  email: string;
}

export interface GetUsersByEmailOutput {
  users: UserType[];
}

export interface InitiateCustomAuthFlowInput {
  confirmationCode: string;
  username: string;
}

export interface InitiateCustomAuthFlowOutput {
  session: string;
}

export interface CompleteCustomAuthFlowInput {
  username: string;
  confirmationCode: string;
  session: string;
}

export interface CompleteCustomAuthFlowSuccessOutput {
  success: true;
}

export interface CompleteCustomAuthFlowFailureOutput {
  success: false;
  session: string;
}

export type CompleteCustomAuthFlowOutput = CompleteCustomAuthFlowSuccessOutput | CompleteCustomAuthFlowFailureOutput;

export interface CompleteOAuth2AuthFlowInput {
  username: string;
  clientId: string;
  redirectUri: string;
  xsrfToken: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  scope?: string;
}

export interface CompleteOAuth2AuthFlowOutput {
  authorizationCode: string;
}

interface CreateUserPoolClientSecretHashInput {
  username: string;
}

interface CreateUserPoolClientSecretHashOutput {
  userPoolClientSecretHash: string;
}
