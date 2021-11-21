import { Auth } from "googleapis";

export type GoogleOAuth2Client = Auth.OAuth2Client;

export type GoogleOAuth2ClientFactory = (clientId: string, clientSecret: string, redirectUri: string) => GoogleOAuth2Client;

export const googleOAuth2ClientFactory: GoogleOAuth2ClientFactory = (clientId: string, clientSecret: string, redirectUri: string) => new Auth.OAuth2Client(clientId, clientSecret, redirectUri);
