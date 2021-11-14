import { inject, injectable } from "inversify";
import { LoggerServiceInterface, UserId } from "@yac/util";
import { calendar_v3 } from "googleapis";
import { TYPES } from "../../inversion-of-control/types";
import { GoogleAuthServiceInterface } from "../tier-1/google.auth.service";
import { GoogleCalendarFactory } from "../../factories/google.calendar.factory";

@injectable()
export class GoogleCalendarService implements GoogleCalendarServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.GoogleAuthServiceInterface) private googleAuthService: GoogleAuthServiceInterface,
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

      const { userId } = params;

      const { oAuth2Client } = await this.googleAuthService.getOAuth2Client({ userId });

      const calendar = this.googleCalendarFactory(oAuth2Client);

      const listResponse = await calendar.events.list({
        calendarId: "primary",
        timeMin: (new Date()).toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = listResponse.data.items || [];

      return { events };
    } catch (error: unknown) {
      this.loggerService.error("Error in getEvents", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface GoogleCalendarServiceInterface {
  initiateAccessFlow(params: InitiateAccessFlowInput): Promise<InitiateAccessFlowOutput>;
  completeAccessFlow(params: CompleteAccessFlowInput): Promise<CompleteAccessFlowOutput>;
  getEvents(params: GetEventsInput): Promise<GetEventsOutput>;
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
}

export interface GetEventsOutput {
  events: calendar_v3.Schema$Event[];
}
