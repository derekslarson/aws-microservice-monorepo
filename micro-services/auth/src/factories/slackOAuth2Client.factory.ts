import { OpenIDConnectTokenResponse, WebClient } from "@slack/web-api";

// Because Slack does not provide a single client to both generate the authorize url and exchange the authorization code for tokens,
// we created a small client below that matches the interface of the google client
export class SlackOAuth2Client {
  private webClient: WebClient;

  constructor(private clientId: string, private clientSecret: string, private redirectUri: string) {
    this.webClient = new WebClient(undefined);
  }

  public generateAuthUrl(params: { scope: string[]; state: string }): string {
    const { scope, state } = params;

    const encodedScope = encodeURIComponent(scope.join(" "));
    const encodedRedirectUri = encodeURIComponent(this.redirectUri);

    return `https://slack.com/openid/connect/authorize?response_type=code&client_id=${this.clientId}&redirect_uri=${encodedRedirectUri}&state=${state}&scope=${encodedScope}`;
  }

  public async getToken(code: string): Promise<{ tokens: OpenIDConnectTokenResponse; }> {
    const tokens = await this.webClient.openid.connect.token({
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      grant_type: "authorization_code",
    });

    return { tokens };
  }
}

export type SlackOAuth2ClientFactory = (clientId: string, clientSecret: string, redirectUri: string) => SlackOAuth2Client;

export const slackOAuth2ClientFactory: SlackOAuth2ClientFactory = (clientId: string, clientSecret: string, redirectUri: string) => new SlackOAuth2Client(clientId, clientSecret, redirectUri);
