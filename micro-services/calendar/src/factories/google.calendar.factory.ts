import { calendar_v3, Auth } from "googleapis";

export type GoogleCalendar = calendar_v3.Calendar;

export type GoogleCalendarFactory = (googleOAuth2Client: Auth.OAuth2Client) => GoogleCalendar;

export const googleCalendarFactory: GoogleCalendarFactory = (googleOAuth2Client: Auth.OAuth2Client) => new calendar_v3.Calendar({ auth: googleOAuth2Client });
