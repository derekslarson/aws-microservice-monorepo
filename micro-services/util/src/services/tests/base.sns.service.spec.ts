/* eslint-disable @typescript-eslint/unbound-method */
import { SNS } from "aws-sdk";
import { LoggerServiceInterface, LoggerService } from "../logger.service";
import { Spied, TestSupport } from "../../test-support/testSupport.class";
import { generateAwsResponse } from "../../test-support/generateAwsResponse";
import { BaseSnsService } from "../base.sns.service";
import { SnsFactory } from "../../factories/sns.factory";

interface Test {
  a: string;
  b: number;
}

// Need to extend the abstract class and expose its protected methods in order to test them
class TestSnsService extends BaseSnsService<Test> {
  constructor(topicArn: string, loggerService: LoggerServiceInterface, snsFactory: SnsFactory) {
    super(topicArn, loggerService, snsFactory);
  }

  public override publish(message: Test) {
    return super.publish(message);
  }
}

describe("BaseSnsService", () => {
  let loggerService: Spied<LoggerService>;
  let testSnsService: TestSnsService;
  let sns: Spied<SNS>;
  const snsFactory: SnsFactory = () => sns as unknown as SNS;

  const mockTopicArn = "test-topic-arn";
  const mockMessage: Test = { a: "test", b: 1 };
  const mockError = new Error("test");

  beforeEach(() => {
    sns = TestSupport.spyOnObject(new SNS());
    loggerService = TestSupport.spyOnClass(LoggerService);

    testSnsService = new TestSnsService(mockTopicArn, loggerService, snsFactory);
  });

  describe("publish", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        sns.publish.and.returnValue(generateAwsResponse({}));
      });

      it("calls sns.publish with the correct parameters", async () => {
        const expectedSnsPublishParam = {
          TopicArn: mockTopicArn,
          Message: JSON.stringify(mockMessage),
        };

        await testSnsService.publish(mockMessage);

        expect(sns.publish).toHaveBeenCalledTimes(1);
        expect(sns.publish).toHaveBeenCalledWith(expectedSnsPublishParam);
      });
    });

    describe("under error conditions", () => {
      describe("when sns.publish throws an error", () => {
        beforeEach(() => {
          sns.publish.and.returnValue(generateAwsResponse(mockError, true));
        });

        it("calls loggerService.error with the correct parameters", async () => {
          try {
            await testSnsService.publish(mockMessage);

            fail("expected to throw");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in publish", { error: mockError, message: mockMessage }, testSnsService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await testSnsService.publish(mockMessage);

            fail("expected to throw");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
