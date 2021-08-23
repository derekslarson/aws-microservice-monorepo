/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, SnsFactory, Message, User, Group } from "@yac/util";
import SNS from "aws-sdk/clients/sns";
import { ConversationType } from "../../enums/conversationType.enum";
import { MessageMimeType } from "../../enums/message.mimeType.enum";
import { GroupId } from "../../types/groupId.type";
import { UserId } from "../../types/userId.type";
import { GroupMessageUpdatedSnsService, GroupMessageUpdatedSnsServiceInterface } from "../groupMessageUpdated.sns.service";

interface GroupMessageUpdatedSnsServiceWithAnyMethod extends GroupMessageUpdatedSnsServiceInterface {
  [key: string]: any;
}

describe("GroupMessageUpdatedSnsService", () => {
  let sns: Spied<SNS>;
  const snsFactory: SnsFactory = () => sns as unknown as SNS;

  let loggerService: Spied<LoggerService>;
  let groupMessageUpdatedSnsService: GroupMessageUpdatedSnsServiceWithAnyMethod;

  const mockGroupMessageUpdatedSnsTopicArn = "mock-group-message-updated-sns-topic-arn";
  const mockConfig = { snsTopicArns: { groupMessageUpdated: mockGroupMessageUpdatedSnsTopicArn } };
  const mockMessageId = "message-id";
  const mockUserIdOne: UserId = "user-mock-id-one";
  const mockUserIdTwo: UserId = "user-mock-id-two";
  const mockGroupId: GroupId = "convo-group-mock-id";

  const mockUser: User = {
    id: mockUserIdOne,
    image: "mock-image",
  };

  const mockGroup: Group = {
    id: mockGroupId,
    name: "mock-name",
    image: "mock-image",
    createdBy: "user-mock-id",
    createdAt: new Date().toISOString(),
  };

  const mockGroupMessage: Message = {
    id: mockMessageId,
    to: mockGroupId,
    from: mockUserIdOne,
    type: ConversationType.Group,
    createdAt: new Date().toISOString(),
    seenAt: { [mockUserIdOne]: new Date().toISOString() },
    reactions: {},
    replyCount: 0,
    mimeType: MessageMimeType.AudioMp3,
    fetchUrl: "mock-fetch-url",
    fromImage: "mock-from-image",
  };

  const mockError = new Error("test");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);

    groupMessageUpdatedSnsService = new GroupMessageUpdatedSnsService(loggerService, snsFactory, mockConfig);
  });

  describe("sendMessage", () => {
    const mockMessage = { message: mockGroupMessage, to: mockGroup, from: mockUser, groupMemberIds: [ mockUserIdOne, mockUserIdTwo ] };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(groupMessageUpdatedSnsService, "publish").and.returnValue(Promise.resolve());
      });
      it("calls this.publish with the correct params", async () => {
        await groupMessageUpdatedSnsService.sendMessage(mockMessage);

        expect(groupMessageUpdatedSnsService.publish).toHaveBeenCalledTimes(1);
        expect(groupMessageUpdatedSnsService.publish).toHaveBeenCalledWith(mockMessage);
      });
    });

    describe("under error conditions", () => {
      beforeEach(() => {
        spyOn(groupMessageUpdatedSnsService, "publish").and.throwError(mockError);
      });

      describe("when this.publish throws", () => {
        it("calls loggerService.error with the correct params", async () => {
          try {
            await groupMessageUpdatedSnsService.sendMessage(mockMessage);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in sendMessage", { error: mockError, message: mockMessage }, groupMessageUpdatedSnsService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await groupMessageUpdatedSnsService.sendMessage(mockMessage);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
