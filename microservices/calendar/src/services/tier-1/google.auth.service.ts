import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { IdServiceInterface } from "@yac/util/src/services/id.service";
import { GoogleOAuth2Client, GoogleOAuth2ClientFactory } from "@yac/util/src/factories/google.oAuth2ClientFactory";
import { Jwt, JwtFactory } from "@yac/util/src/factories/jwt.factory";
import { UserId } from "@yac/util/src/types/userId.type";
import { BadRequestError } from "@yac/util/src/errors/badRequest.error";
import { NotFoundError } from "@yac/util/src/errors/notFound.error";
import { TYPES } from "../../inversion-of-control/types";
import { GoogleCredentials, GoogleCredentialsRepositoryInterface } from "../../repositories/google.credentials.dynamo.repository";
import { EnvConfigInterface } from "../../config/env.config";
import { AuthFlowAttemptRepositoryInterface } from "../../repositories/authFlowAttempt.dynamo.repository";

@injectable()
export class GoogleAuthService implements GoogleAuthServiceInterface {
  private jwt: Jwt;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.GoogleCredentialsRepositoryInterface) private googleCredentialsRepository: GoogleCredentialsRepositoryInterface,
    @inject(TYPES.AuthFlowAttemptRepositoryInterface) private authFlowAttemptRepository: AuthFlowAttemptRepositoryInterface,
    @inject(TYPES.GoogleOAuth2ClientFactory) private googleOAuth2ClientFactory: GoogleOAuth2ClientFactory,
    @inject(TYPES.EnvConfigInterface) private config: GoogleAuthServiceServiceConfig,
    @inject(TYPES.JwtFactory) jwtFactory: JwtFactory,
  ) {
    this.jwt = jwtFactory();
  }

  public async initiateAccessFlow(params: InitiateAccessFlowInput): Promise<InitiateAccessFlowOutput> {
    try {
      this.loggerService.trace("initiateAccessFlow called", { params }, this.constructor.name);

      const { userId, redirectUri, scope } = params;

      const state = this.idService.generateId();

      const { oAuth2Client } = this.getOAuth2ClientWithoutCredentials();

      const scopeWithEmail = scope.includes("email") ? scope : [ ...scope, "email" ];
      const scopeWithOpenId = scopeWithEmail.includes("openid") ? scopeWithEmail : [ ...scopeWithEmail, "openid" ];

      const authUri = oAuth2Client.generateAuthUrl({
        scope: scopeWithOpenId,
        access_type: "offline",
        prompt: "consent",
        state,
      });

      await this.authFlowAttemptRepository.createAuthFlowAttempt({ authFlowAttempt: { userId, state, redirectUri } });

      return { authUri };
    } catch (error: unknown) {
      this.loggerService.error("Error in initiateAccessFlow", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async completeAccessFlow(params: CompleteAccessFlowInput): Promise<CompleteAccessFlowOutput> {
    try {
      this.loggerService.trace("completeAccessFlow called", { params }, this.constructor.name);

      const { authorizationCode, state } = params;

      const { oAuth2Client } = this.getOAuth2ClientWithoutCredentials();

      const [ { authFlowAttempt }, { tokens } ] = await Promise.all([
        this.authFlowAttemptRepository.getAuthFlowAttempt({ state }),
        oAuth2Client.getToken(authorizationCode),
      ]);

      if (!tokens.access_token || !tokens.refresh_token || !tokens.id_token || !tokens.expiry_date || !tokens.token_type || !tokens.scope) {
        throw new Error(`Google response malformed:\n${JSON.stringify(tokens, null, 2)}`);
      }

      const { sub: accountId, email } = this.jwt.decode(tokens.id_token) as { sub: string; email: string; };

      const googleCredentials: GoogleCredentials = {
        userId: authFlowAttempt.userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        idToken: tokens.id_token,
        accountId,
        email,
        expiryDate: tokens.expiry_date,
        tokenType: tokens.token_type,
        scope: tokens.scope,
      };

      await Promise.all([
        this.googleCredentialsRepository.upsertGoogleCredentials({ googleCredentials }),
        this.authFlowAttemptRepository.deleteAuthFlowAttempt({ state }),
      ]);

      return { redirectUri: authFlowAttempt.redirectUri };
    } catch (error: unknown) {
      this.loggerService.error("Error in completeAccessFlow", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOAuth2Client(params: GetOAuth2ClientInput): Promise<GetOAuth2ClientOutput> {
    try {
      this.loggerService.trace("getOAuth2Client called", { params }, this.constructor.name);

      const { userId, accountId } = params;

      const { oAuth2Client } = this.getOAuth2ClientWithoutCredentials();

      const { googleCredentials } = await this.googleCredentialsRepository.getGoogleCredentials({ userId, accountId });

      oAuth2Client.setCredentials({
        access_token: googleCredentials.accessToken,
        refresh_token: googleCredentials.refreshToken,
        id_token: googleCredentials.idToken,
        token_type: googleCredentials.tokenType,
        expiry_date: googleCredentials.expiryDate,
        scope: googleCredentials.scope,
      });

      const { token: freshAccesToken } = await oAuth2Client.getAccessToken();

      if (!freshAccesToken) {
        throw new Error("Error getting access token");
      }

      if (googleCredentials.accessToken !== freshAccesToken) {
        const expiryDate = oAuth2Client.credentials.expiry_date as number;
        const refreshToken = oAuth2Client.credentials.refresh_token as string;

        await this.googleCredentialsRepository.updateGoogleCredentials({ userId, accountId, updates: { accessToken: freshAccesToken, refreshToken, expiryDate } });
      }

      return { oAuth2Client };
    } catch (error: unknown) {
      if (error instanceof NotFoundError && error.message === "Google Credentials not found.") {
        throw new BadRequestError(`No calendar access for userId ${params.userId}. Please request access.`);
      }

      this.loggerService.error("Error in getOAuth2Client", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getAccounts(params: GetAccountsInput): Promise<GetAccountsOutput> {
    try {
      this.loggerService.trace("getAccounts called", { params }, this.constructor.name);

      const { userId } = params;

      const { googleCredentials } = await this.googleCredentialsRepository.getGoogleCredentialsByUserId({ userId });

      const accounts = googleCredentials.map(({ accountId, email }) => ({ id: accountId, email }));

      return { accounts };
    } catch (error: unknown) {
      this.loggerService.error("Error in getAccounts", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private getOAuth2ClientWithoutCredentials(): GetOAuth2ClientWithoutCredentialsOutput {
    try {
      this.loggerService.trace("getOAuth2ClientWithoutCredentials called", {}, this.constructor.name);

      const oAuth2Client = this.googleOAuth2ClientFactory(this.config.googleClient.id, this.config.googleClient.secret, this.config.googleClient.redirectUri);

      return { oAuth2Client };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOAuth2ClientWithoutCredentials", { error }, this.constructor.name);

      throw error;
    }
  }
}

export interface GoogleAuthServiceInterface {
  initiateAccessFlow(params: InitiateAccessFlowInput): Promise<InitiateAccessFlowOutput>;
  completeAccessFlow(params: CompleteAccessFlowInput): Promise<CompleteAccessFlowOutput>;
  getOAuth2Client(params: GetOAuth2ClientInput): Promise<GetOAuth2ClientOutput>;
  getAccounts(params: GetAccountsInput): Promise<GetAccountsOutput>;
}

type GoogleAuthServiceServiceConfig = Pick<EnvConfigInterface, "googleClient">;

export interface InitiateAccessFlowInput {
  userId: UserId;
  redirectUri: string;
  scope: string[];
}

export interface InitiateAccessFlowOutput {
  authUri: string;
}

export interface CompleteAccessFlowInput {
  authorizationCode: string;
  state: string;
}

export interface CompleteAccessFlowOutput {
  redirectUri: string;
}

export interface GetOAuth2ClientInput {
  userId: UserId;
  accountId: string;
}

export interface GetOAuth2ClientOutput {
  oAuth2Client: GoogleOAuth2Client;
}

export interface GetAccountsInput {
  userId: UserId;
}

export interface Account {
  id: string;
  email: string;
}
export interface GetAccountsOutput {
  accounts: Account[];
}

export interface GetOAuth2ClientWithoutCredentialsOutput {
  oAuth2Client: GoogleOAuth2Client;
}
