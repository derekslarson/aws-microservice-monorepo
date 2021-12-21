import { calendar_v3, GlobalOptions } from "@googleapis/calendar";
import { GoogleOAuth2Client } from "@yac/util/src/factories/google.oAuth2ClientFactory";

export type GoogleCalendar = calendar_v3.Calendar;

export type GoogleCalendarFactory = (googleOAuth2Client: GoogleOAuth2Client) => GoogleCalendar;

export const googleCalendarFactory: GoogleCalendarFactory = (googleOAuth2Client: GoogleOAuth2Client) => new calendar_v3.Calendar({
  // version differences between the libs is causing a type error
  auth: googleOAuth2Client as unknown as GlobalOptions["auth"],
});
