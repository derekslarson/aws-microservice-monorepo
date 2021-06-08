/* eslint-disable @typescript-eslint/unbound-method */
import { SNS } from "aws-sdk";
import { SnsFactory } from "../../factories/sns.factory";
import { Spied, TestSupport } from "../../test-support";

import { LoggerService } from "../logger.service";
import { UserSignedUpSnsService, UserSignedUpSnsServiceInterface } from "../userSignedUp.sns.service";

interface UserSignedUpSnsServiceWithProtectedMethods extends UserSignedUpSnsServiceInterface {
  [key: string]: any;
}

describe("UserSignedUpSnsService", () => {
  let loggerService: Spied<LoggerService>;
  let userSignedUpSnsService: UserSignedUpSnsServiceWithProtectedMethods;
  const snsFactory: SnsFactory = () => ({} as unknown as SNS);

  const mockTopicArn = "test-topic-arn";
  const mockEnv = { snsTopicArns: { userSignedUp: mockTopicArn } };
  const mockMessage = { id: "mock-id", email: "mock-email" };
  const mockError = new Error("mock error");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);

    userSignedUpSnsService = new UserSignedUpSnsService(loggerService, snsFactory, mockEnv);
  });

  describe("sendMessage", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(userSignedUpSnsService, "publish").and.returnValue(Promise.resolve());
      });

      it("calls this.publish with the correct parameters", async () => {
        await userSignedUpSnsService.sendMessage(mockMessage);

        expect(userSignedUpSnsService.publish).toHaveBeenCalledTimes(1);
        expect(userSignedUpSnsService.publish).toHaveBeenCalledWith(mockMessage);
      });
    });

    describe("under error conditions", () => {
      describe("when this.publish throws an error", () => {
        beforeEach(() => {
          spyOn(userSignedUpSnsService, "publish").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct parameters", async () => {
          try {
            await userSignedUpSnsService.sendMessage(mockMessage);

            fail("Expected an error");
          } catch (error: unknown) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in sendMessage", { error: mockError, message: mockMessage }, userSignedUpSnsService.constructor.name);
          }
        });

        it("throws the error", async () => {
          try {
            await userSignedUpSnsService.sendMessage(mockMessage);

            fail("Expected an error");
          } catch (error: unknown) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
