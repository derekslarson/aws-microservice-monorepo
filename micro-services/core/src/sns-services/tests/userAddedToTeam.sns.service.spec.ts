/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, User, Team, SnsFactory } from "@yac/util";
import SNS from "aws-sdk/clients/sns";
import { UserAddedToTeamSnsService, UserAddedToTeamSnsServiceInterface } from "../userAddedToTeam.sns.service";

interface UserAddedToTeamSnsServiceWithAnyMethod extends UserAddedToTeamSnsServiceInterface {
  [key: string]: any;
}

describe("UserAddedToTeamSnsService", () => {
  let sns: Spied<SNS>;
  const snsFactory: SnsFactory = () => sns as unknown as SNS;

  let loggerService: Spied<LoggerService>;
  let userAddedToTeamSnsService: UserAddedToTeamSnsServiceWithAnyMethod;

  const mockUserAddedToTeamSnsTopicArn = "mock-user-added-to-team-sns-topic-arn";
  const mockConfig = { snsTopicArns: { userAddedToTeam: mockUserAddedToTeamSnsTopicArn } };
  const mockUserId = "user-mock-id";
  const mockTeamId = "team-mock-id";

  const mockUser: User = {
    id: mockUserId,
    image: "mock-image",
  };

  const mockTeam: Team = {
    id: mockTeamId,
    name: "mock-name",
    image: "mock-image",
    createdBy: "user-mock-id",
  };

  const mockError = new Error("test");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    userAddedToTeamSnsService = TestSupport.spyOnClass(UserAddedToTeamSnsService);

    userAddedToTeamSnsService = new UserAddedToTeamSnsService(loggerService, snsFactory, mockConfig);
  });

  describe("sendMessage", () => {
    const mockMessage = {
      teamMemberIds: [],
      team: mockTeam,
      user: mockUser,
    };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(userAddedToTeamSnsService, "publish").and.returnValue(Promise.resolve());
      });
      it("calls this.publish with the correct params", async () => {
        await userAddedToTeamSnsService.sendMessage(mockMessage);

        expect(userAddedToTeamSnsService.publish).toHaveBeenCalledTimes(1);
        expect(userAddedToTeamSnsService.publish).toHaveBeenCalledWith(mockMessage);
      });
    });

    describe("under error conditions", () => {
      beforeEach(() => {
        spyOn(userAddedToTeamSnsService, "publish").and.throwError(mockError);
      });

      describe("when this.publish throws", () => {
        it("calls loggerService.error with the correct params", async () => {
          try {
            await userAddedToTeamSnsService.sendMessage(mockMessage);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in sendMessage", { error: mockError, message: mockMessage }, userAddedToTeamSnsService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await userAddedToTeamSnsService.sendMessage(mockMessage);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
