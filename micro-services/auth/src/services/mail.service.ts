import { inject, injectable } from "inversify";
import { SES } from "aws-sdk";
import { LoggerServiceInterface } from "@yac/util";
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

  public async sendConfirmationCode(emailAddress: string, confirmationCode: string): Promise<void> {
    try {
      this.loggerService.trace("sendConfirmationCode called", { emailAddress, confirmationCode }, this.constructor.name);

      const sendEmailParams: SES.Types.SendEmailRequest = {
        Source: this.config.mailSender,
        Destination: { ToAddresses: [ emailAddress ] },
        Message: {
          Subject: { Data: "Log into your Yac account" },
          Body: { Html: { Data: `<p>Use this code to log into your Yac account.</p><p><strong>${confirmationCode}</strong></p><p>This code expires in 30 minutes.</p>` } },
        },
      };

      await this.ses.sendEmail(sendEmailParams).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in sendConfirmationCode", { error, emailAddress, confirmationCode }, this.constructor.name);

      throw error;
    }
  }
}

export type MailServiceConfigInterface = Pick<EnvConfigInterface, "mailSender">;

export interface MailServiceInterface {
  sendConfirmationCode(emailAddress: string, confirmationCode: string): Promise<void>;
}
