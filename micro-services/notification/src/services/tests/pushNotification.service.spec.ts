/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, generateAwsResponse, SnsFactory } from "@yac/util";
import SNS from "aws-sdk/clients/sns";
import { PushNotificationEvent } from "../../enums/pushNotification.event.enum";
import { PushNotificationService, PushNotificationServiceInterface } from "../pushNotification.service";

describe("PushNotificationService", () => {
  let sns: Spied<SNS>;
  const snsFactory: SnsFactory = () => sns as unknown as SNS;

  let loggerService: Spied<LoggerService>;
  let pushNotificationService: PushNotificationServiceInterface;

  const mockPlatformApplicationArn = "mock-platform-application-arn";
  const mockPlatformEndpointArn = "mock-platform-endpoint-arn";
  const mockToken = "mock-token";
  const mockEvent = PushNotificationEvent.FriendMessageCreated;
  const mockTitle = "mock-title";
  const mockBody = "mock-body";
  const mockConfig = { platformApplicationArn: mockPlatformApplicationArn };
  const mockError = new Error("test");

  beforeEach(() => {
    sns = TestSupport.spyOnObject(new SNS());
    loggerService = TestSupport.spyOnClass(LoggerService);

    pushNotificationService = new PushNotificationService(loggerService, mockConfig, snsFactory);
  });

  describe("createPlatformEndpoint", () => {
    const params = { token: mockToken };

    describe("under normal conditions", () => {
      beforeEach(() => {
        sns.createPlatformEndpoint.and.returnValue(generateAwsResponse({ EndpointArn: mockPlatformEndpointArn }));
      });

      it("calls sns.createPlatformEndpoint with the correct params", async () => {
        await pushNotificationService.createPlatformEndpoint(params);

        expect(sns.createPlatformEndpoint).toHaveBeenCalledTimes(1);
        expect(sns.createPlatformEndpoint).toHaveBeenCalledWith({
          PlatformApplicationArn: mockPlatformApplicationArn,
          Token: mockToken,
        });
      });

      it("returns the created endpoint ARN", async () => {
        const response = await pushNotificationService.createPlatformEndpoint(params);

        expect(response).toEqual({ endpointArn: mockPlatformEndpointArn });
      });
    });

    describe("under error conditions", () => {
      describe("when sns.createPlatformEndpoint doesn't return an endpoint arn", () => {
        beforeEach(() => {
          sns.createPlatformEndpoint.and.returnValue(generateAwsResponse({}));
        });

        it("throws a valid error", async () => {
          try {
            await pushNotificationService.createPlatformEndpoint(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error.message).toBe("EndpointArn not returned from sns.createPlatformEndpoint");
          }
        });
      });

      describe("when sns.createPlatformEndpoint throws an error", () => {
        beforeEach(() => {
          sns.createPlatformEndpoint.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await pushNotificationService.createPlatformEndpoint(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in createPlatformEndpoint", { error: mockError, params }, pushNotificationService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await pushNotificationService.createPlatformEndpoint(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("sendPushNotification", () => {
    const params = { endpointArn: mockPlatformEndpointArn, event: mockEvent, title: mockTitle, body: mockBody };

    describe("under normal conditions", () => {
      beforeEach(() => {
        sns.publish.and.returnValue(generateAwsResponse({}));
      });

      it("calls sns.publish with the correct params", async () => {
        await pushNotificationService.sendPushNotification(params);

        expect(sns.publish).toHaveBeenCalledTimes(1);
        expect(sns.publish).toHaveBeenCalledWith({
          Message: JSON.stringify({
            default: mockEvent,
            GCM: JSON.stringify({ notification: { title: mockTitle, body: mockBody }, data: { event: mockEvent } }),
          }),
          TargetArn: mockPlatformEndpointArn,
          MessageStructure: "json",
        });
      });
    });

    describe("under error conditions", () => {
      describe("when sns.publish throws an error", () => {
        beforeEach(() => {
          sns.publish.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await pushNotificationService.sendPushNotification(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in sendPushNotification", { error: mockError, params }, pushNotificationService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await pushNotificationService.sendPushNotification(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
