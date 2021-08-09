/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, SnsProcessorServiceInterface, User, Team } from "@yac/util";
import { WebSocketMediatorService, WebSocketMediatorServiceInterface } from "../../mediator-services/webSocket.mediator.service";
import { UserAddedToTeamSnsProcessorService } from "../userAddedToTeam.sns.processor.service";

describe("UserAddedToTeamSnsProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let webSocketMediatorService: Spied<WebSocketMediatorServiceInterface>;
  let userAddedToTeamSnsProcessorService: SnsProcessorServiceInterface;

  const mockUserAddedToTeamSnsTopicArn = "mock-user-added-to-team-sns-topic-arn";
  const mockConfig = { snsTopicArns: { userAddedToTeam: mockUserAddedToTeamSnsTopicArn } };
  const mockUserIdOne = "user-mock-id-one";
  const mockUserIdTwo = "user-mock-id-two";
  const mockConnectionIdOne = "mock-connection-id-one";
  const mockConnectionIdTwo = "mock-connection-id-two";
  const mockTeamMemberIds = [ mockUserIdOne, mockUserIdTwo ];
  const mockConnectionIds = [ mockConnectionIdOne, mockConnectionIdTwo ];
  const mockUser: User = {
    id: mockUserIdOne,
    image: "mock-image",
  };

  const mockTeam: Team = {
    id: "team-mock-id",
    name: "mock-name",
    image: "mock-image",
    createdBy: "user-mock-id",
  };

  const mockRecord = {
    topicArn: mockUserAddedToTeamSnsTopicArn,
    message: {
      user: mockUser,
      team: mockTeam,
      teamMemberIds: mockTeamMemberIds,
    },
  };
  const mockError = new Error("test");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    webSocketMediatorService = TestSupport.spyOnClass(WebSocketMediatorService);

    userAddedToTeamSnsProcessorService = new UserAddedToTeamSnsProcessorService(loggerService, webSocketMediatorService, mockConfig);
  });

  describe("determineRecordSupport", () => {
    describe("under normal conditions", () => {
      describe("when passed a record with a topic arn matching snsTopicArns.userAddedToTeam in the config", () => {
        it("returns true", () => {
          const result = userAddedToTeamSnsProcessorService.determineRecordSupport(mockRecord);

          expect(result).toBe(true);
        });
      });

      describe("when passed a record with a topic arn not matching snsTopicArns.userAddedToTeam in the config", () => {
        const record = {
          ...mockRecord,
          topicArn: "test",
        };

        it("returns false", () => {
          const result = userAddedToTeamSnsProcessorService.determineRecordSupport(record);

          expect(result).toBe(false);
        });
      });
    });
  });

  describe("processRecord", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        webSocketMediatorService.getConnectionIdsByUserIds.and.returnValue(Promise.resolve({ connectionIds: mockConnectionIds }));
        webSocketMediatorService.sendUserAddedToTeamMessage.and.returnValue(Promise.resolve());
      });

      it("calls webSocketMediatorService.getConnectionIdsByUserIds with the correct parameters", async () => {
        await userAddedToTeamSnsProcessorService.processRecord(mockRecord);

        expect(webSocketMediatorService.getConnectionIdsByUserIds).toHaveBeenCalledTimes(1);
        expect(webSocketMediatorService.getConnectionIdsByUserIds).toHaveBeenCalledWith({ userIds: mockTeamMemberIds });
      });

      it("calls webSocketMediatorService.sendUserAddedToTeamMessage with the correct parameters", async () => {
        await userAddedToTeamSnsProcessorService.processRecord(mockRecord);

        expect(webSocketMediatorService.sendUserAddedToTeamMessage).toHaveBeenCalledTimes(2);
        expect(webSocketMediatorService.sendUserAddedToTeamMessage).toHaveBeenCalledWith({ connectionId: mockConnectionIdOne, team: mockTeam, user: mockUser });
        expect(webSocketMediatorService.sendUserAddedToTeamMessage).toHaveBeenCalledWith({ connectionId: mockConnectionIdTwo, team: mockTeam, user: mockUser });
      });
    });

    describe("under error conditions", () => {
      describe("when webSocketMediatorService.getConnectionIdsByUserIds throws an error", () => {
        beforeEach(() => {
          webSocketMediatorService.getConnectionIdsByUserIds.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await userAddedToTeamSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, userAddedToTeamSnsProcessorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await userAddedToTeamSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
