/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Role } from "@yac/util";
import axios from "axios";
import { readFileSync } from "fs";
import { backoff, documentClient, generateRandomString, ISO_DATE_REGEX, URL_REGEX, wait } from "../../../../e2e/util";
import { EntityType } from "../../src/enums/entityType.enum";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { PendingMessage } from "../../src/mediator-services/message.mediator.service";
import { FriendConversation, RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { RawConversationUserRelationship } from "../../src/repositories/conversationUserRelationship.dynamo.repository";
import { ConversationType } from "../../src/enums/conversationType.enum";
import { MessageId } from "../../src/types/messageId.type";
import { PendingMessageId } from "../../src/types/pendingMessageId.type";
import { UserId } from "../../src/types/userId.type";
import { createConversationUserRelationship, createFriendConversation, getConversationUserRelationship, getMessage, getPendingMessage } from "../util";
import { MessageMimeType } from "../../src/enums/message.mimeType.enum";

describe("POST /users/{userId}/friends/{friendId}/messages (Create Friend Message)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;

  const mimeType = MessageMimeType.AudioMp3;
  const mockUserId: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;

  describe("under normal conditions", () => {
    let friendship: RawConversation<FriendConversation>;
    let conversationUserRelationship: RawConversationUserRelationship<ConversationType.Friend>;
    let conversationUserRelationshipTwo: RawConversationUserRelationship<ConversationType.Friend>;

    beforeEach(async () => {
      ({ conversation: friendship } = await createFriendConversation({ userId, friendId: mockUserId }));

      ([ { conversationUserRelationship }, { conversationUserRelationship: conversationUserRelationshipTwo } ] = await Promise.all([
        createConversationUserRelationship({ type: ConversationType.Friend, conversationId: friendship.id, userId, role: Role.Admin }),
        createConversationUserRelationship({ type: ConversationType.Friend, conversationId: friendship.id, userId: mockUserId, role: Role.Admin }),
      ]));
    });

    it("returns a valid response", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const body = { mimeType };

      try {
        const { status, data } = await axios.post(`${baseUrl}/users/${userId}/friends/${mockUserId}/messages`, body, { headers });

        expect(status).toBe(201);
        expect(data).toEqual({
          pendingMessage: {
            id: jasmine.stringMatching(new RegExp(`${KeyPrefix.Message}.*`)),
            conversationId: friendship.id,
            from: userId,
            mimeType,
            createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
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
        const { data } = await axios.post(`${baseUrl}/users/${userId}/friends/${mockUserId}/messages`, body, { headers });

        const pendingMessageId = (data.pendingMessage.id as MessageId).replace(KeyPrefix.Message, KeyPrefix.PendingMessage) as PendingMessageId;

        const { pendingMessage } = await getPendingMessage({ pendingMessageId });

        expect(pendingMessage).toEqual({
          entityType: EntityType.PendingMessage,
          pk: pendingMessageId,
          sk: pendingMessageId,
          id: pendingMessageId,
          conversationId: friendship.id,
          from: userId,
          createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
          mimeType,
        });
      } catch (error) {
        fail(error);
      }
    });

    describe("before a file is uploaded to the 'uploadUrl' in the response", () => {
      it("doesn't create a Message entity", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const body = { mimeType };

        try {
          const { data } = await axios.post(`${baseUrl}/users/${userId}/friends/${mockUserId}/messages`, body, { headers });

          await wait(3000);

          const { message } = await getMessage({ messageId: data.pendingMessage.id });

          expect(message).not.toBeDefined();
        } catch (error) {
          fail(error);
        }
      });
    });

    describe("after a file is uploaded to the 'uploadUrl' in the response", () => {
      it("a creates a valid Message entity", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const body = { mimeType };

        try {
          const { data } = await axios.post(`${baseUrl}/users/${userId}/friends/${mockUserId}/messages`, body, { headers });

          const file = readFileSync(`${process.cwd()}/e2e/test-message.mp3`);

          const uploadHeaders = { "content-type": mimeType };
          const uploadBody = { data: file };

          await axios.put(data.pendingMessage.uploadUrl, uploadBody, { headers: uploadHeaders });

          await wait(3000);

          const { message } = await backoff(() => getMessage({ messageId: data.pendingMessage.id }), (res) => !!res.message);

          expect(message).toEqual({
            entityType: EntityType.Message,
            pk: data.pendingMessage.id,
            sk: data.pendingMessage.id,
            gsi1pk: friendship.id,
            gsi1sk: data.pendingMessage.id,
            id: data.pendingMessage.id,
            mimeType,
            createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
            conversationId: friendship.id,
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
          const { data } = await axios.post<{ pendingMessage: PendingMessage; }>(`${baseUrl}/users/${userId}/friends/${mockUserId}/messages`, body, { headers });

          const file = readFileSync(`${process.cwd()}/e2e/test-message.mp3`);

          const uploadHeaders = { "content-type": mimeType };
          const uploadBody = { data: file };

          await axios.put(data.pendingMessage.uploadUrl, uploadBody, { headers: uploadHeaders });

          const pendingMessageId = data.pendingMessage.id.replace(KeyPrefix.Message, KeyPrefix.PendingMessage) as PendingMessageId;

          const { pendingMessage } = await backoff(() => getPendingMessage({ pendingMessageId }), (res) => !res.pendingMessage);

          expect(pendingMessage).not.toBeDefined();
        } catch (error) {
          fail(error);
        }
      });

      it("updates the conversation members' ConversationUserRelationship entities", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const body = { mimeType };

        try {
          const { data } = await axios.post<{ pendingMessage: PendingMessage; }>(`${baseUrl}/users/${userId}/friends/${mockUserId}/messages`, body, { headers });

          const file = readFileSync(`${process.cwd()}/e2e/test-message.mp3`);

          const uploadHeaders = { "content-type": mimeType };
          const uploadBody = { data: file };

          await axios.put(data.pendingMessage.uploadUrl, uploadBody, { headers: uploadHeaders });

          const [
            { conversationUserRelationship: conversationUserRelationshipUpdated },
            { conversationUserRelationship: conversationUserRelationshipTwoUpdated },
          ] = await Promise.all([
            backoff(() => getConversationUserRelationship({ userId, conversationId: friendship.id }), (res) => res.conversationUserRelationship?.updatedAt !== conversationUserRelationship.updatedAt),
            backoff(() => getConversationUserRelationship({ userId: mockUserId, conversationId: friendship.id }), (res) => !!res.conversationUserRelationship?.unreadMessages),
          ]);

          expect(conversationUserRelationshipUpdated?.updatedAt).toEqual(jasmine.stringMatching(ISO_DATE_REGEX));
          expect(conversationUserRelationshipUpdated?.updatedAt).not.toEqual(conversationUserRelationship.updatedAt);

          expect(conversationUserRelationshipUpdated?.gsi1sk).toEqual(jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)));
          expect(conversationUserRelationshipUpdated?.gsi1sk).not.toEqual(conversationUserRelationship.gsi1sk);

          expect(conversationUserRelationshipUpdated?.gsi2sk).toEqual(jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.FriendConversation}.*`)));
          expect(conversationUserRelationshipUpdated?.gsi2sk).not.toEqual(conversationUserRelationship.gsi2sk);

          expect(conversationUserRelationshipUpdated?.unreadMessages).toEqual(conversationUserRelationship.unreadMessages);

          expect(conversationUserRelationshipTwoUpdated?.updatedAt).toEqual(jasmine.stringMatching(ISO_DATE_REGEX));
          expect(conversationUserRelationshipTwoUpdated?.updatedAt).not.toEqual(conversationUserRelationshipTwo.updatedAt);

          expect(conversationUserRelationshipTwoUpdated?.gsi1sk).toEqual(jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)));
          expect(conversationUserRelationshipTwoUpdated?.gsi1sk).not.toEqual(conversationUserRelationshipTwo.gsi1sk);

          expect(conversationUserRelationshipTwoUpdated?.gsi2sk).toEqual(jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.FriendConversation}.*`)));
          expect(conversationUserRelationshipTwoUpdated?.gsi2sk).not.toEqual(conversationUserRelationshipTwo.gsi2sk);

          expect(conversationUserRelationshipTwoUpdated?.unreadMessages).toEqual(documentClient.createSet([ data.pendingMessage.id ]));
        } catch (error) {
          fail(error);
        }
      });
    });
  });

  describe("under error conditions", () => {
    const mockUserIdTwo: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;

    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const body = { mimeType };
        const headers = { };

        try {
          await axios.post(`${baseUrl}/users/${userId}/friends/${mockUserId}/messages`, body, { headers });
          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an id of a user that does not match the id in the jwt is passed in", () => {
      it("throws a 403 error", async () => {
        const body = { mimeType };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.post(`${baseUrl}/users/${mockUserId}/friends/${mockUserIdTwo}/messages`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(403);
          expect(error.response?.statusText).toBe("Forbidden");
        }
      });
    });

    describe("when passed invalid parameters", () => {
      it("throws a 400 error with a valid structure", async () => {
        const body = { mimeType: "test" };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.post(`${baseUrl}/users/test/friends/test/messages`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: {
                userId: "Failed constraint check for string: Must be a user id",
                friendId: "Failed constraint check for string: Must be a user id",
              },
              body: { mimeType: 'Expected "audio/mpeg" | "audio/mp4" | "video/mp4" | "video/webm", but was string' },
            },
          });
        }
      });
    });
  });
});
