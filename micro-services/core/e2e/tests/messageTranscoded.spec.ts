/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { MessageTranscodedSnsMessage, OrganizationId } from "@yac/util";
import { backoff, generateRandomString, sns } from "../../../../e2e/util";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { MessageMimeType } from "../../src/enums/message.mimeType.enum";
import { GroupConversation, RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { RawPendingMessage } from "../../src/repositories/pendingMessage.dynamo.repository";
import { MessageId } from "../../src/types/messageId.type";
import { UserId } from "../../src/types/userId.type";
import {
  createGroupConversation,
  createPendingMessage,
  getPendingMessage,
} from "../util";

describe("Message Transcoded SNS Topic", () => {
  const userId = process.env.userId as UserId;
  const messageTranscodedSnsTopicArn = process.env["message-transcoded-sns-topic-arn"] as string;
  const mockMimeType = MessageMimeType.AudioMp4;
  const mockNewMimeType = MessageMimeType.AudioMp3;

  describe("under normal conditions", () => {
    describe("when a message is published to the SNS topic", () => {
      let group: RawConversation<GroupConversation>;
      let pendingMessage: RawPendingMessage;
      let messageId: MessageId;

      const mockOrganizationId: OrganizationId = `${KeyPrefix.Organization}${generateRandomString()}`;

      beforeEach(async () => {
        ({ conversation: group } = await createGroupConversation({ createdBy: userId, organizationId: mockOrganizationId, name: generateRandomString(5) }));

        ({ pendingMessage } = await createPendingMessage({ conversationId: group.id, from: userId, mimeType: mockMimeType }));

        messageId = pendingMessage.id.replace(KeyPrefix.PendingMessage, KeyPrefix.Message) as MessageId;
      });

      it("updates the PendingMessage entity", async () => {
        try {
          const snsMessage: MessageTranscodedSnsMessage = {
            key: `groups/${group.id}/${pendingMessage.id}`,
            messageId,
            newMimeType: mockNewMimeType,
          };

          await sns.publish({
            TopicArn: messageTranscodedSnsTopicArn,
            Message: JSON.stringify(snsMessage),
          }).promise();

          const { pendingMessage: pendingMessageWithNewMimeType } = await backoff(() => getPendingMessage({ pendingMessageId: pendingMessage.id }), (res) => res.pendingMessage?.mimeType === mockNewMimeType);

          expect(pendingMessageWithNewMimeType).toEqual({
            ...pendingMessage,
            mimeType: mockNewMimeType,
          });
        } catch (error) {
          fail(error);
        }
      });
    });
  });
});
