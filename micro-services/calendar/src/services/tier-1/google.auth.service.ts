import { inject, injectable } from "inversify";
import { BadRequestError, IdServiceInterface, LoggerServiceInterface, NotFoundError, UserId } from "@yac/util";
import { Auth } from "googleapis";
import { TYPES } from "../../inversion-of-control/types";
import { GoogleCredentials, GoogleCredentialsRepositoryInterface } from "../../repositories/google.credentials.dynamo.repository";
import { GoogleOAuth2Client, GoogleOAuth2ClientFactory } from "../../factories/google.oAuth2Client.factory";
import { EnvConfigInterface } from "../../config/env.config";
import { AuthFlowAttemptRepositoryInterface } from "../../repositories/authFlowAttempt.dynamo.repository";

@injectable()
export class GoogleAuthService implements GoogleAuthServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.GoogleCredentialsRepositoryInterface) private googleCredentialsRepository: GoogleCredentialsRepositoryInterface,
    @inject(TYPES.AuthFlowAttemptRepositoryInterface) private authFlowAttemptRepository: AuthFlowAttemptRepositoryInterface,
    @inject(TYPES.GoogleOAuth2ClientFactory) private googleOAuth2ClientFactory: GoogleOAuth2ClientFactory,
    @inject(TYPES.EnvConfigInterface) private config: GoogleAuthServiceServiceConfig,
  ) {}

  public async initiateAccessFlow(params: InitiateAccessFlowInput): Promise<InitiateAccessFlowOutput> {
    try {
      this.loggerService.trace("initiateAccessFlow called", { params }, this.constructor.name);

      const { userId, redirectUri, scope } = params;

      const state = this.idService.generateId();

      const { oAuth2Client } = this.getOAuth2ClientWithoutCredentials();

      const authUri = oAuth2Client.generateAuthUrl({
        scope,
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

      if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date || !tokens.token_type || !tokens.scope) {
        throw new Error(`Google response malformed:\n${JSON.stringify(tokens, null, 2)}`);
      }

      const googleCredentials: GoogleCredentials = {
        userId: authFlowAttempt.userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
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

      const { userId } = params;

      const { oAuth2Client } = this.getOAuth2ClientWithoutCredentials();

      const { googleCredentials } = await this.googleCredentialsRepository.getGoogleCredentials({ userId });

      const googleCredentialsSnakeCase: Auth.Credentials = {
        access_token: googleCredentials.accessToken,
        refresh_token: googleCredentials.refreshToken,
        token_type: googleCredentials.tokenType,
        expiry_date: googleCredentials.expiryDate,
        scope: googleCredentials.scope,
      };

      oAuth2Client.setCredentials(googleCredentialsSnakeCase);

      const { token: freshAccesToken } = await oAuth2Client.getAccessToken();

      if (!freshAccesToken) {
        throw new Error("Error getting access token");
      }

      if (googleCredentials.accessToken !== freshAccesToken) {
        const expiryDate = oAuth2Client.credentials.expiry_date as number;
        const refreshToken = oAuth2Client.credentials.refresh_token as string;

        await this.googleCredentialsRepository.updateGoogleCredentials({ userId, updates: { accessToken: freshAccesToken, refreshToken, expiryDate } });
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
}

export interface GetOAuth2ClientOutput {
  oAuth2Client: GoogleOAuth2Client;
}

export interface GetOAuth2ClientWithoutCredentialsOutput {
  oAuth2Client: GoogleOAuth2Client;
}
