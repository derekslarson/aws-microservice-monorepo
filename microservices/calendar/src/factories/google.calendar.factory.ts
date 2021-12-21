import { calendar_v3, GlobalOptions } from "@googleapis/calendar";

export type GoogleCalendar = calendar_v3.Calendar;

export type GoogleCalendarFactory = (googleOAuth2Client: GlobalOptions["auth"]) => GoogleCalendar;

export const googleCalendarFactory: GoogleCalendarFactory = (googleOAuth2Client: GlobalOptions["auth"]) => new calendar_v3.Calendar({ auth: googleOAuth2Client });
