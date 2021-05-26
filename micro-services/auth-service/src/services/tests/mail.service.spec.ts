/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, generateAwsResponse } from "@yac/core";
import { SES } from "aws-sdk";
import { SesFactory } from "../../factories/ses.factory";
import { MailService, MailServiceInterface, MailServiceConfigInterface } from "../mail.service";

fdescribe("HttpRequestService", () => {
  let ses: Spied<SES>;
  const sesFactory: SesFactory = () => ses as unknown as SES;

  let loggerService: Spied<LoggerService>;
  let mailService: MailServiceInterface;

  const mockMailSender = "test@yac.com";
  const mockConfig: MailServiceConfigInterface = { mailSender: mockMailSender };
  const mockEmailAddress = "john@doe.com";
  const mockError = new Error("test");

  beforeEach(() => {
    // importing SES for some reason brings in the namespace, so spyOnClass isn't working
    ses = { sendEmail: jasmine.createSpy("sendEmail") } as unknown as Spied<SES>;

    ses.sendEmail.and.returnValue(generateAwsResponse({}));

    loggerService = TestSupport.spyOnClass(LoggerService);

    mailService = new MailService(loggerService, mockConfig, sesFactory);
  });

  describe("sendConfirmationCode", () => {
    const mockConfirmationCode = "123456";

    const expectedSendEmailParams = {
      Source: mockMailSender,
      Destination: { ToAddresses: [ mockEmailAddress ] },
      Message: {
        Subject: { Data: "Log into your Yac account" },
        Body: { Html: { Data: `<p>Use this code to log into your Yac account.</p><p><strong>${mockConfirmationCode}</strong></p><p>This code expires in 30 minutes.</p>` } },
      },
    };

    describe("under normal conditions", () => {
      it("calls ses.sendEmail with the correct params", async () => {
        await mailService.sendConfirmationCode(mockEmailAddress, mockConfirmationCode);

        expect(ses.sendEmail).toHaveBeenCalledTimes(1);
        expect(ses.sendEmail).toHaveBeenCalledWith(expectedSendEmailParams);
      });
    });

    describe("under error conditions", () => {
      describe("when ses.sendEmail throws an error", () => {
        beforeEach(() => {
          ses.sendEmail.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await mailService.sendConfirmationCode(mockEmailAddress, mockConfirmationCode);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in sendConfirmationCode", { error: mockError, emailAddress: mockEmailAddress, confirmationCode: mockConfirmationCode }, mailService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await mailService.sendConfirmationCode(mockEmailAddress, mockConfirmationCode);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
