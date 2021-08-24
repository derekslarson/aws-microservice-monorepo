/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, SnsFactory, Message, User } from "@yac/util";
import SNS from "aws-sdk/clients/sns";
import { ConversationType } from "../../enums/conversationType.enum";
import { MessageMimeType } from "../../enums/message.mimeType.enum";
import { UserId } from "../../types/userId.type";
import { FriendMessageCreatedSnsService, FriendMessageCreatedSnsServiceInterface } from "../friendMessageCreated.sns.service";

interface FriendMessageCreatedSnsServiceWithAnyMethod extends FriendMessageCreatedSnsServiceInterface {
  [key: string]: any;
}

describe("FriendMessageCreatedSnsService", () => {
  let sns: Spied<SNS>;
  const snsFactory: SnsFactory = () => sns as unknown as SNS;

  let loggerService: Spied<LoggerService>;
  let friendMessageCreatedSnsService: FriendMessageCreatedSnsServiceWithAnyMethod;

  const mockFriendMessageCreatedSnsTopicArn = "mock-friend-message-created-sns-topic-arn";
  const mockConfig = { snsTopicArns: { friendMessageCreated: mockFriendMessageCreatedSnsTopicArn } };
  const mockMessageId = "message-id";
  const mockTo: UserId = "user-mock-to";
  const mockFrom: UserId = "user-mock-from";

  const mockToUser: User = {
    id: mockTo,
    image: "mock-image",
  };

  const mockFromUser: User = {
    id: mockFrom,
    image: "mock-image",
  };

  const mockFriendMessage: Message = {
    id: mockMessageId,
    to: mockTo,
    from: mockFrom,
    type: ConversationType.Friend,
    createdAt: new Date().toISOString(),
    seenAt: { [mockFrom]: new Date().toISOString() },
    reactions: {},
    replyCount: 0,
    mimeType: MessageMimeType.AudioMp3,
    fetchUrl: "mock-fetch-url",
    fromImage: "mock-from-image",
  };

  const mockError = new Error("test");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);

    friendMessageCreatedSnsService = new FriendMessageCreatedSnsService(loggerService, snsFactory, mockConfig);
  });

  describe("sendMessage", () => {
    const mockMessage = { message: mockFriendMessage, to: mockToUser, from: mockFromUser };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(friendMessageCreatedSnsService, "publish").and.returnValue(Promise.resolve());
      });
      it("calls this.publish with the correct params", async () => {
        await friendMessageCreatedSnsService.sendMessage(mockMessage);

        expect(friendMessageCreatedSnsService.publish).toHaveBeenCalledTimes(1);
        expect(friendMessageCreatedSnsService.publish).toHaveBeenCalledWith(mockMessage);
      });
    });

    describe("under error conditions", () => {
      beforeEach(() => {
        spyOn(friendMessageCreatedSnsService, "publish").and.throwError(mockError);
      });

      describe("when this.publish throws", () => {
        it("calls loggerService.error with the correct params", async () => {
          try {
            await friendMessageCreatedSnsService.sendMessage(mockMessage);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in sendMessage", { error: mockError, message: mockMessage }, friendMessageCreatedSnsService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await friendMessageCreatedSnsService.sendMessage(mockMessage);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
