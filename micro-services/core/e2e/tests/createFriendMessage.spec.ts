/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import axios from "axios";
import { MakeRequired, Role } from "@yac/util";
import { generateRandomString, ISO_DATE_REGEX, URL_REGEX, wait } from "../../../../e2e/util";
import { EntityType } from "../../src/enums/entityType.enum";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { FriendConversation, RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { ConversationType } from "../../src/enums/conversationType.enum";
import { MessageId } from "../../src/types/messageId.type";
import { PendingMessageId } from "../../src/types/pendingMessageId.type";
import { UserId } from "../../src/types/userId.type";
import {
  createConversationUserRelationship,
  createFriendConversation,
  createRandomUser,
  getMessage,
  getPendingMessage,
  getUser,
  GetUserOutput,
} from "../util";
import { MessageMimeType } from "../../src/enums/message.mimeType.enum";
import { RawUser } from "../../src/repositories/user.dynamo.repository";

describe("POST /users/{userId}/friends/{friendId}/messages (Create Friend Message)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;
  const mimeType = MessageMimeType.AudioMp3;

  describe("under normal conditions", () => {
    let user: RawUser;
    let otherUser: RawUser;
    let friendship: RawConversation<FriendConversation>;

    beforeAll(async () => {
      ({ user } = await getUser({ userId }) as MakeRequired<GetUserOutput, "user">);
    });

    beforeEach(async () => {
      ({ user: otherUser } = await createRandomUser());
      ({ conversation: friendship } = await createFriendConversation({ userId, friendId: otherUser.id }));

      await Promise.all([
        createConversationUserRelationship({ type: ConversationType.Friend, conversationId: friendship.id, userId, role: Role.Admin }),
        createConversationUserRelationship({ type: ConversationType.Friend, conversationId: friendship.id, userId: otherUser.id, role: Role.Admin }),
      ]);
    });

    it("returns a valid response", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const body = { mimeType };

      try {
        const { status, data } = await axios.post(`${baseUrl}/users/${userId}/friends/${otherUser.id}/messages`, body, { headers });

        expect(status).toBe(201);
        expect(data).toEqual({
          pendingMessage: {
            id: jasmine.stringMatching(new RegExp(`${KeyPrefix.Message}.*`)),
            to: {
              realName: otherUser.realName,
              username: otherUser.username,
              id: otherUser.id,
              email: otherUser.email,
              phone: otherUser.phone,
              image: jasmine.stringMatching(URL_REGEX),
            },
            from: {
              realName: user.realName,
              username: user.username,
              id: user.id,
              email: user.email,
              phone: user.phone,
              image: jasmine.stringMatching(URL_REGEX),
            },
            type: ConversationType.Friend,
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
        const { data } = await axios.post(`${baseUrl}/users/${userId}/friends/${otherUser.id}/messages`, body, { headers });

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

    it("doesn't create a Message entity", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const body = { mimeType };

      try {
        const { data } = await axios.post(`${baseUrl}/users/${userId}/friends/${otherUser.id}/messages`, body, { headers });

        await wait(3000);

        const { message } = await getMessage({ messageId: data.pendingMessage.id });

        expect(message).not.toBeDefined();
      } catch (error) {
        fail(error);
      }
    });
  });

  describe("under error conditions", () => {
    const mockUserId: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;
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
