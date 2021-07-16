/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Role } from "@yac/core";
import axios from "axios";
import { readFileSync } from "fs";
import { backoff, generateRandomString, ISO_DATE_REGEX, URL_REGEX, wait } from "../../../../e2e/util";
import { RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { UserId } from "../../src/types/userId.type";
import { MimeType } from "../../src/enums/mimeType.enum";
import { createConversationUserRelationship, createGroupConversation, getMessage, getPendingMessage } from "../util";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { PendingMessageId } from "../../src/types/pendingMessageId.type";
import { MessageId } from "../../src/types/messageId.type";
import { EntityType } from "../../src/enums/entityType.enum";

describe("POST /groups/{groupId}/messages (Create Group Message)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;

  describe("under normal conditions", () => {
    const mimeType = MimeType.AudioMp3;
    const mockUserId: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;
    let group: RawConversation;

    beforeEach(async () => {
      ({ conversation: group } = await createGroupConversation({ createdBy: userId, name: generateRandomString(5) }));

      await Promise.all([
        createConversationUserRelationship({ conversationId: group.id, userId, role: Role.Admin }),
        createConversationUserRelationship({ conversationId: group.id, userId: mockUserId, role: Role.User }),
      ]);
    });

    it("returns a valid response", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const body = { mimeType };

      try {
        const { status, data } = await axios.post(`${baseUrl}/groups/${group.id}/messages`, body, { headers });

        expect(status).toBe(201);
        expect(data).toEqual({
          pendingMessage: {
            id: jasmine.stringMatching(new RegExp(`${KeyPrefix.Message}.*`)),
            conversationId: group.id,
            from: userId,
            mimeType,
            sentAt: jasmine.stringMatching(ISO_DATE_REGEX),
            uploadUrl: jasmine.stringMatching(URL_REGEX),
          },
        });
      } catch (error) {
        fail(error);
      }
    });

    it("creates a valid PendingMessage entity", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const body = { mimeType };

      try {
        const { data } = await axios.post(`${baseUrl}/groups/${group.id}/messages`, body, { headers });

        const pendingMessageId = (data.pendingMessage.id as MessageId).replace(KeyPrefix.Message, KeyPrefix.PendingMessage) as PendingMessageId;

        const { pendingMessage } = await getPendingMessage({ pendingMessageId });

        expect(pendingMessage).toEqual({
          entityType: EntityType.PendingMessage,
          pk: pendingMessageId,
          sk: pendingMessageId,
          id: pendingMessageId,
          conversationId: group.id,
          from: userId,
          sentAt: jasmine.stringMatching(ISO_DATE_REGEX),
          mimeType,
        });
      } catch (error) {
        fail(error);
      }
    });

    describe("before a file is updated to the 'uploadUrl' in the response", () => {
      it("doesn't create a Message entity", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const body = { mimeType };

        try {
          const { data } = await axios.post(`${baseUrl}/groups/${group.id}/messages`, body, { headers });

          await wait(3000);

          const { message } = await getMessage({ messageId: data.pendingMessage.id });

          expect(message).not.toBeDefined();
        } catch (error) {
          fail(error);
        }
      });
    });

    describe("after a file is updated to the 'uploadUrl' in the response", () => {
      it("a creates a valid Message entity", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const body = { mimeType };

        try {
          const { data } = await axios.post(`${baseUrl}/groups/${group.id}/messages`, body, { headers });

          const file = readFileSync(`${process.cwd()}/e2e/test-message.mp3`);

          await axios.put(data.pendingMessage.uploadUrl, { data: file }, { headers: { "content-type": mimeType } });

          await wait(3000);

          const { message } = await backoff(() => getMessage({ messageId: data.pendingMessage.id }), (res) => !!res.message);

          expect(message).toEqual({
            entityType: EntityType.Message,
            pk: data.pendingMessage.id,
            sk: data.pendingMessage.id,
            gsi1pk: group.id,
            gsi1sk: data.pendingMessage.id,
            id: data.pendingMessage.id,
            mimeType,
            sentAt: jasmine.stringMatching(ISO_DATE_REGEX),
            conversationId: group.id,
            seenAt: {
              [userId]: jasmine.stringMatching(ISO_DATE_REGEX),
              [mockUserId]: null,
            },
            reactions: { },
            from: userId,
            replyCount: 0,
          });
        } catch (error) {
          fail(error);
        }
      });

      it("a deletes the PendingMessage entity", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const body = { mimeType };

        try {
          const { data } = await axios.post(`${baseUrl}/groups/${group.id}/messages`, body, { headers });

          const file = readFileSync(`${process.cwd()}/e2e/test-message.mp3`);

          await axios.put(data.pendingMessage.uploadUrl, { data: file }, { headers: { "content-type": mimeType } });

          const pendingMessageId = (data.pendingMessage.id as MessageId).replace(KeyPrefix.Message, KeyPrefix.PendingMessage) as PendingMessageId;

          const { pendingMessage } = await backoff(() => getPendingMessage({ pendingMessageId }), (res) => !res.pendingMessage);

          expect(pendingMessage).not.toBeDefined();
        } catch (error) {
          fail(error);
        }
      });
    });
  });
});
