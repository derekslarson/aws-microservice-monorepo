import { inject, injectable } from "inversify";
import { BadRequestError, LoggerServiceInterface, NotFoundError, UserId } from "@yac/util";
import { calendar_v3 } from "googleapis";
import { TYPES } from "../../inversion-of-control/types";
import { Account, GetOAuth2ClientOutput as AuthServiceOAuth2ClientOutput, GoogleAuthServiceInterface } from "../tier-1/google.auth.service";
import { GoogleCalendarFactory } from "../../factories/google.calendar.factory";
import { GetSettingsOutput as SettingsServiceGetSettingsOutput, GoogleSettingsServiceInterface, UpdateSettingsUpdates } from "../tier-1/google.settings.service";
import { GoogleSettings } from "../../repositories/google.settings.dynamo.repository";

@injectable()
export class GoogleCalendarService implements GoogleCalendarServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.GoogleAuthServiceInterface) private googleAuthService: GoogleAuthServiceInterface,
    @inject(TYPES.GoogleSettingsServiceInterface) private googleSettingsService: GoogleSettingsServiceInterface,
    @inject(TYPES.GoogleCalendarFactory) private googleCalendarFactory: GoogleCalendarFactory,
  ) {
  }

  public async initiateAccessFlow(params: InitiateAccessFlowInput): Promise<InitiateAccessFlowOutput> {
    try {
      this.loggerService.trace("initiateAccessFlow called", { params }, this.constructor.name);

      const { userId, redirectUri } = params;

      const { authUri } = await this.googleAuthService.initiateAccessFlow({
        userId,
        redirectUri,
        scope: [ "https://www.googleapis.com/auth/calendar" ],
      });

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

      const { redirectUri } = await this.googleAuthService.completeAccessFlow({ authorizationCode, state });

      return { redirectUri };
    } catch (error: unknown) {
      this.loggerService.error("Error in completeAccessFlow", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getEvents(params: GetEventsInput): Promise<GetEventsOutput> {
    try {
      this.loggerService.trace("getEvents called", { params }, this.constructor.name);

      const { userId, limit, exclusiveStartKey, minTime, maxTime } = params;

      const { oAuth2Client, settings } = await this.getOAuth2ClientAndSettings({ userId });

      const calendar = this.googleCalendarFactory(oAuth2Client);

      const listResponse = await calendar.events.list({
        calendarId: settings.defaultCalendarId || "primary",
        maxResults: limit ?? 25,
        singleEvents: true,
        orderBy: "startTime",
        pageToken: exclusiveStartKey,
        timeMin: minTime ? new Date(minTime).toISOString() : new Date().toISOString(),
        timeMax: maxTime ? new Date(maxTime).toISOString() : undefined,
      });

      const events = listResponse.data.items || [];

      return { events, lastEvaluatedKey: listResponse.data.nextPageToken };
    } catch (error: unknown) {
      this.loggerService.error("Error in getEvents", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getSettings(params: GetSettingsInput): Promise<GetSettingsOutput> {
    try {
      this.loggerService.trace("getSettings called", { params }, this.constructor.name);

      const { userId } = params;

      const { googleSettings } = await this.googleSettingsService.getSettings({ userId });

      return { settings: googleSettings };
    } catch (error: unknown) {
      this.loggerService.error("Error in getSettings", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateSettings(params: UpdateSettingsInput): Promise<UpdateSettingsOutput> {
    try {
      this.loggerService.trace("updateSettings called", { params }, this.constructor.name);

      const { userId, updates } = params;

      await this.googleSettingsService.updateSettings({ userId, updates });
    } catch (error: unknown) {
      this.loggerService.error("Error in updateSettings", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getAccounts(params: GetAccountsInput): Promise<GetAccountsOutput> {
    try {
      this.loggerService.trace("getAccounts called", { params }, this.constructor.name);

      const { userId } = params;

      const { accounts } = await this.googleAuthService.getAccounts({ userId });

      return { accounts };
    } catch (error: unknown) {
      this.loggerService.error("Error in getAccounts", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private async getOAuth2ClientAndSettings(params: GetOAuth2ClientAndSettingsInput): Promise<GetOAuth2ClientAndSettingsOutput> {
    try {
      this.loggerService.trace("getOAuth2ClientAndSettings called", { params }, this.constructor.name);

      const { userId } = params;

      let settings: GoogleSettings = { userId };

      try {
        const { googleSettings } = await this.googleSettingsService.getSettings({ userId });

        settings = googleSettings;
      } catch (error) {
        if (!(error instanceof NotFoundError)) {
          throw error;
        }
      }

      if (!settings.defaultAccountId) {
        const { accounts } = await this.googleAuthService.getAccounts({ userId });

        if (!accounts.length) {
          throw new BadRequestError(`No calendar access for userId ${params.userId}. Please request access.`);
        }

        if (accounts.length > 1) {
          throw new BadRequestError(`Multiple accounts linked to userId ${params.userId} without a defaultAccountId set. Please set a defaultAccountId.`);
        }

        settings.defaultAccountId = accounts[0].id;

        await this.googleSettingsService.updateSettings({ userId, updates: { defaultAccountId: settings.defaultAccountId } });
      }

      const { oAuth2Client } = await this.googleAuthService.getOAuth2Client({ userId, accountId: settings.defaultAccountId });

      return { oAuth2Client, settings };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOAuth2ClientAndSettings", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface GoogleCalendarServiceInterface {
  initiateAccessFlow(params: InitiateAccessFlowInput): Promise<InitiateAccessFlowOutput>;
  completeAccessFlow(params: CompleteAccessFlowInput): Promise<CompleteAccessFlowOutput>;
  getEvents(params: GetEventsInput): Promise<GetEventsOutput>;
  getSettings(params: GetSettingsInput): Promise<GetSettingsOutput>;
  updateSettings(params: UpdateSettingsInput): Promise<UpdateSettingsOutput>;
  getAccounts(params: GetAccountsInput): Promise<GetAccountsOutput>;
}

export interface InitiateAccessFlowInput {
  userId: UserId;
  redirectUri: string;
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

export interface GetEventsInput {
  userId: UserId;
  limit?: number;
  exclusiveStartKey?: string;
  minTime?: string | number;
  maxTime?: string | number;
}

export interface GetEventsOutput {
  events: calendar_v3.Schema$Event[];
  lastEvaluatedKey?: calendar_v3.Schema$Events["nextPageToken"];
}

export interface GetSettingsInput {
  userId: UserId;
}

export interface GetSettingsOutput {
  settings: SettingsServiceGetSettingsOutput["googleSettings"];
}
export interface UpdateSettingsInput {
  userId: UserId;
  updates: UpdateSettingsUpdates;
}

export type UpdateSettingsOutput = void;

export interface GetAccountsInput {
  userId: UserId;
}

export interface GetAccountsOutput {
  accounts: Account[];
}

export interface GetOAuth2ClientAndSettingsInput {
  userId: UserId;
}

export interface GetOAuth2ClientAndSettingsOutput {
  oAuth2Client: AuthServiceOAuth2ClientOutput["oAuth2Client"];
  settings: SettingsServiceGetSettingsOutput["googleSettings"];
}
