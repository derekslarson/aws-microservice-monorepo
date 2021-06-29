/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, SnsProcessorServiceInterface, SnsProcessorServiceRecord, Spied, TestSupport } from "@yac/core";
import { UserCreationInput } from "../../models/user/user.creation.input.model";
import { UserService } from "../user.service";
import { UserSignedUpProcessorService, UserSignedUpProcessorServiceConfigInterface } from "../userSignedUp.processor.service";

describe("UserSignedUpProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let userService: Spied<UserService>;
  let userSignedUpProcessorService: SnsProcessorServiceInterface;

  const mockId = "mock-id";
  const mockEmail = "mock@email.com";
  const mockError = new Error("mock-error");

  const mockUserSignedUpSnsTopicArn = "mock-user-signed-up-sns-topic-arn";
  const mockMessage = {
    id: mockId,
    email: mockEmail,
  };

  const mockRecord: SnsProcessorServiceRecord = {
    topicArn: mockUserSignedUpSnsTopicArn,
    message: mockMessage,
  };

  const mockEnvConfig: UserSignedUpProcessorServiceConfigInterface = { snsTopicArns: { userSignedUp: mockUserSignedUpSnsTopicArn } };

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    userService = TestSupport.spyOnClass(UserService);

    userSignedUpProcessorService = new UserSignedUpProcessorService(loggerService, userService, mockEnvConfig);
  });

  describe("determineRecordSupport", () => {
    describe("under normal conditions", () => {
      describe("when passed a record with a topicArn matching config.snsTopicArns.userSignedUp", () => {
        it("returns true", () => {
          const result = userSignedUpProcessorService.determineRecordSupport(mockRecord);

          expect(result).toBe(true);
        });
      });

      describe("when passed a record with a topicArn not matching config.snsTopicArns.userSignedUp", () => {
        const mockInvalidRecord: SnsProcessorServiceRecord = {
          topicArn: "invalid-sns-topic-arn",
          message: {},
        };

        it("returns false", () => {
          const result = userSignedUpProcessorService.determineRecordSupport(mockInvalidRecord);

          expect(result).toBe(false);
        });
      });
    });
  });

  describe("processRecord", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        userService.createUser.and.returnValue(Promise.resolve());
      });

      it("calls userService.createUser with the correct params", async () => {
        const expectedCreateUserParams: UserCreationInput = {
          id: mockId,
          email: mockEmail,
        };

        await userSignedUpProcessorService.processRecord(mockRecord);

        expect(userService.createUser).toHaveBeenCalledTimes(1);
        expect(userService.createUser).toHaveBeenCalledWith(expectedCreateUserParams);
      });
    });

    describe("under error conditions", () => {
      describe("when userService.createUser throws an error", () => {
        beforeEach(() => {
          userService.createUser.and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await userSignedUpProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, userSignedUpProcessorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await userSignedUpProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
