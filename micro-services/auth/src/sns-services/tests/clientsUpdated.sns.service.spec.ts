/* eslint-disable @typescript-eslint/unbound-method */
import { SNS } from "aws-sdk";
import { LoggerService, SnsFactory, Spied, TestSupport } from "@yac/util";
import { ClientsUpdatedSnsService, ClientsUpdatedSnsServiceInterface } from "../clientsUpdated.sns.service";

interface ClientsUpdatedSnsServiceWithProtectedMethods extends ClientsUpdatedSnsServiceInterface {
  [key: string]: any;
}

describe("ClientsUpdatedSnsService", () => {
  let loggerService: Spied<LoggerService>;
  let clientsUpdatedSnsService: ClientsUpdatedSnsServiceWithProtectedMethods;
  const snsFactory: SnsFactory = () => ({} as unknown as SNS);

  const mockTopicArn = "test-topic-arn";
  const mockEnv = { snsTopicArns: { clientsUpdated: mockTopicArn } };
  const mockError = new Error("mock error");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);

    clientsUpdatedSnsService = new ClientsUpdatedSnsService(loggerService, snsFactory, mockEnv);
  });

  describe("sendMessage", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(clientsUpdatedSnsService, "publish").and.returnValue(Promise.resolve());
      });

      it("calls this.publish with the correct parameters", async () => {
        await clientsUpdatedSnsService.sendMessage();

        expect(clientsUpdatedSnsService.publish).toHaveBeenCalledTimes(1);
        expect(clientsUpdatedSnsService.publish).toHaveBeenCalledWith({});
      });
    });

    describe("under error conditions", () => {
      describe("when this.publish throws an error", () => {
        beforeEach(() => {
          spyOn(clientsUpdatedSnsService, "publish").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct parameters", async () => {
          try {
            await clientsUpdatedSnsService.sendMessage();

            fail("Expected an error");
          } catch (error: unknown) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in clientsUpdated", { error: mockError }, clientsUpdatedSnsService.constructor.name);
          }
        });

        it("throws the error", async () => {
          try {
            await clientsUpdatedSnsService.sendMessage();

            fail("Expected an error");
          } catch (error: unknown) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
