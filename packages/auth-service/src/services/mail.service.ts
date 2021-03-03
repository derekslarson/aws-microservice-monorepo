import { inject, injectable } from "inversify";
import { SES } from "aws-sdk";
import { LoggerServiceInterface } from "@yac/core";
import { SesFactory } from "../factories/ses.factory";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";

@injectable()
export class MailService implements MailServiceInterface {
  private ses: SES;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) private config: MailServiceConfigInterface,
    @inject(TYPES.SesFactory) sesFactory: SesFactory,
  ) {
    this.ses = sesFactory();
  }

  public async sendMagicLink(emailAddress: string, magicLink: string): Promise<void> {
    try {
      this.loggerService.trace("sendMagicLink called", { emailAddress, magicLink }, this.constructor.name);

      const sendEmailParams: SES.Types.SendEmailRequest = {
        Source: this.config.mailSender,
        Destination: { ToAddresses: [ emailAddress ] },
        Message: {
          Subject: { Data: "Log into your Yac account" },
          Body: {
            Html: {
              Data: `
                <a href="${magicLink}" target="_blank">Click here to log into your Yac account.</a>
                <p>This link expires in 30 minutes.</p>
              `,
            },
          },
        },
      };

      await this.ses.sendEmail(sendEmailParams).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMagicLink", { error, emailAddress, magicLink }, this.constructor.name);

      throw error;
    }
  }
}

export type MailServiceConfigInterface = Pick<EnvConfigInterface, "mailSender">;

export interface MailServiceInterface {
  sendMagicLink(emailAddress: string, magicLink: string): Promise<void>;
}
