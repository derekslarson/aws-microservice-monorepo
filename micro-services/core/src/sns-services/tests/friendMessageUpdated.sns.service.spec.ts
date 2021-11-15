/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, SnsFactory, Message, User } from "@yac/util";
import SNS from "aws-sdk/clients/sns";
import { ConversationType } from "../../enums/conversationType.enum";
import { MessageMimeType } from "../../enums/message.mimeType.enum";
import { FriendMessageUpdatedSnsService, FriendMessageUpdatedSnsServiceInterface } from "../friendMessageUpdated.sns.service";

interface FriendMessageUpdatedSnsServiceWithAnyMethod extends FriendMessageUpdatedSnsServiceInterface {
  [key: string]: any;
}

describe("FriendMessageUpdatedSnsService", () => {
  let sns: Spied<SNS>;
  const snsFactory: SnsFactory = () => sns as unknown as SNS;

  let loggerService: Spied<LoggerService>;
  let friendMessageUpdatedSnsService: FriendMessageUpdatedSnsServiceWithAnyMethod;

  const mockFriendMessageUpdatedSnsTopicArn = "mock-friend-message-updated-sns-topic-arn";
  const mockConfig = { snsTopicArns: { friendMessageUpdated: mockFriendMessageUpdatedSnsTopicArn } };
  const mockMessageId = "message-id";
  const mockTitle = "title";
  const mockToUser: User = {
    id: "user-mock-to",
    image: "mock-image",
  };

  const mockFromUser: User = {
    id: "user-mock-from",
    image: "mock-image",
  };

  const mockFriendMessage: Message = {
    id: mockMessageId,
    to: mockToUser,
    from: mockFromUser,
    type: ConversationType.Friend,
    createdAt: new Date().toISOString(),
    seenAt: { [mockFromUser.id]: new Date().toISOString() },
    reactions: {},
    replyCount: 0,
    title: mockTitle,
    mimeType: MessageMimeType.AudioMp3,
    fetchUrl: "mock-fetch-url",
  };

  const mockError = new Error("test");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);

    friendMessageUpdatedSnsService = new FriendMessageUpdatedSnsService(loggerService, snsFactory, mockConfig);
  });

  describe("sendMessage", () => {
    const mockMessage = { message: mockFriendMessage };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(friendMessageUpdatedSnsService, "publish").and.returnValue(Promise.resolve());
      });
      it("calls this.publish with the correct params", async () => {
        await friendMessageUpdatedSnsService.sendMessage(mockMessage);

        expect(friendMessageUpdatedSnsService.publish).toHaveBeenCalledTimes(1);
        expect(friendMessageUpdatedSnsService.publish).toHaveBeenCalledWith(mockMessage);
      });
    });

    describe("under error conditions", () => {
      beforeEach(() => {
        spyOn(friendMessageUpdatedSnsService, "publish").and.throwError(mockError);
      });

      describe("when this.publish throws", () => {
        it("calls loggerService.error with the correct params", async () => {
          try {
            await friendMessageUpdatedSnsService.sendMessage(mockMessage);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in sendMessage", { error: mockError, message: mockMessage }, friendMessageUpdatedSnsService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await friendMessageUpdatedSnsService.sendMessage(mockMessage);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
