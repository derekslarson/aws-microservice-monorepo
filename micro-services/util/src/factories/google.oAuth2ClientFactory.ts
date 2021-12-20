import { OAuth2Client } from "google-auth-library";

export type GoogleOAuth2Client = OAuth2Client;

export type GoogleOAuth2ClientFactory = (clientId: string, clientSecret: string, redirectUri: string) => GoogleOAuth2Client;

export const googleOAuth2ClientFactory: GoogleOAuth2ClientFactory = (clientId: string, clientSecret: string, redirectUri: string) => new OAuth2Client(clientId, clientSecret, redirectUri);
