import { inject, injectable } from "inversify";
import { IdServiceInterface, LoggerServiceInterface, UserId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { GoogleCredentialsRepositoryInterface } from "../repositories/google.credentials.dynamo.repository";
import { GoogleOAuth2Client, GoogleOAuth2ClientFactory } from "../factories/google.oAuth2Client.factory";
import { EnvConfigInterface } from "../config/env.config";
import { AuthFlowAttemptRepositoryInterface } from "../repositories/authFlowAttempt.dynamo.repository";

@injectable()
export class GoogleAuthService implements GoogleAuthServiceInterface {
  private oAuth2Client: GoogleOAuth2Client;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.GoogleCredentialsRepositoryInterface) private googleCredentialsRepository: GoogleCredentialsRepositoryInterface,
    @inject(TYPES.AuthFlowAttemptRepositoryInterface) private authFlowAttempt: AuthFlowAttemptRepositoryInterface,
    @inject(TYPES.GoogleOAuth2ClientFactory) googleOAuth2ClientFactory: GoogleOAuth2ClientFactory,
    @inject(TYPES.EnvConfigInterface) config: GoogleAuthServiceServiceConfig,
  ) {
    const { id, secret, redirectUri } = config.googleClient;

    this.oAuth2Client = googleOAuth2ClientFactory(id, secret, redirectUri);
  }

  public async initiateGoogleAccessFlow(params: InitiateGoogleAccessFlowInput): Promise<InitiateGoogleAccessFlowOutput> {
    try {
      this.loggerService.trace("initiateGoogleAccessFlow called", { params }, this.constructor.name);

      const { userId, redirectUri } = params;

      const state = this.idService.generateId();

      const authUri = this.oAuth2Client.generateAuthUrl({
        scope: [ "https://www.googleapis.com/auth/calendar" ],
        access_type: "offline",
        prompt: "consent",
        state,
      });

      await this.authFlowAttempt.createAuthFlowAttempt({ authFlowAttempt: { userId, state, redirectUri } });

      return { authUri };
    } catch (error: unknown) {
      this.loggerService.error("Error in initiateGoogleAccessFlow", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async completeGoogleAccessFlow(params: CompleteGoogleAccessFlowInput): Promise<CompleteGoogleAccessFlowOutput> {
    try {
      this.loggerService.trace("completeGoogleAccessFlow called", { params }, this.constructor.name);

      const { authorizationCode, state } = params;

      const [ { authFlowAttempt }, { tokens } ] = await Promise.all([
        this.authFlowAttempt.getAuthFlowAttempt({ state }),
        this.oAuth2Client.getToken(authorizationCode),
      ]);

      const { access_token: accessToken, refresh_token: refreshToken } = tokens;

      if (!accessToken || !refreshToken) {
        throw new Error("accessToken or refreshToken missing from Google response");
      }

      await Promise.all([
        // upsert credentials entity
        this.googleCredentialsRepository.updateGoogleCredentials({ userId: authFlowAttempt.userId, updates: { accessToken, refreshToken } }),
        this.authFlowAttempt.deleteAuthFlowAttempt({ state }),
      ]);

      return { redirectUri: authFlowAttempt.redirectUri };
    } catch (error: unknown) {
      this.loggerService.error("Error in completeGoogleAccessFlow", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface GoogleAuthServiceInterface {
  initiateGoogleAccessFlow(params: InitiateGoogleAccessFlowInput): Promise<InitiateGoogleAccessFlowOutput>;
  completeGoogleAccessFlow(params: CompleteGoogleAccessFlowInput): Promise<CompleteGoogleAccessFlowOutput>;
}

type GoogleAuthServiceServiceConfig = Pick<EnvConfigInterface, "googleClient">;

export interface InitiateGoogleAccessFlowInput {
  userId: UserId;
  redirectUri: string;
}

export interface InitiateGoogleAccessFlowOutput {
  authUri: string;
}

export interface CompleteGoogleAccessFlowInput {
  authorizationCode: string;
  state: string;
}

export interface CompleteGoogleAccessFlowOutput {
  redirectUri: string;
}
