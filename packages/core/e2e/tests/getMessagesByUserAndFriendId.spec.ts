/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { MakeRequired, Role } from "@yac/util";
import axios from "axios";
import { generateRandomString, URL_REGEX, wait } from "../../../../e2e/util";
import { ConversationType } from "../../src/enums/conversationType.enum";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { MessageMimeType } from "../../src/enums/message.mimeType.enum";
import { FriendConversation, RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { RawMessage } from "../../src/repositories/message.dynamo.repository";
import { RawUser } from "../../src/repositories/user.dynamo.repository";
import { UserId } from "../../src/types/userId.type";
import { createConversationUserRelationship, createFriendConversation, createMessage, createRandomUser, getUser, GetUserOutput } from "../util";

describe("GET /users/{userId}/friends/{friendId}/messages (Get Messages by User and Friend Id)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;

  let user: RawUser;
  let otherUser: RawUser;

  beforeAll(async () => {
    ([ { user }, { user: otherUser } ] = await Promise.all([
      getUser({ userId }) as Promise<MakeRequired<GetUserOutput, "user">>,
      createRandomUser(),
    ]));
  });

  describe("under normal conditions", () => {
    let friendship: RawConversation<FriendConversation>;

    let message: RawMessage;
    let messageTwo: RawMessage;

    beforeAll(async () => {
      ({ conversation: friendship } = await createFriendConversation({ userId, friendId: otherUser.id }));

      ([ { message } ] = await Promise.all([
        createMessage({ from: otherUser.id, conversationId: friendship.id, conversationMemberIds: [ userId, otherUser.id ], replyCount: 1, mimeType: MessageMimeType.AudioMp3, title: generateRandomString(5) }),
        createConversationUserRelationship({ type: ConversationType.Friend, conversationId: friendship.id, userId, role: Role.User }),
      ]));

      await wait(1000);

      // We have to create the messages in sequence to ensure sort order
      ([ { message: messageTwo } ] = await Promise.all([
        createMessage({ from: userId, conversationId: friendship.id, conversationMemberIds: [ userId, otherUser.id ], mimeType: MessageMimeType.AudioMp3, title: generateRandomString(5) }),
        // We have to create a reply to prove that it doesnt get returned at root level
        createMessage({ from: otherUser.id, conversationId: friendship.id, conversationMemberIds: [ userId, otherUser.id ], replyTo: message.id, mimeType: MessageMimeType.AudioMp3, title: generateRandomString(5) }),
      ]));
    });

    describe("when not passed a 'limit' query param", () => {
      it("returns a valid response", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.get(`${baseUrl}/users/${userId}/friends/${otherUser.id}/messages`, { headers });

          expect(status).toBe(200);
          expect(data).toEqual({
            messages: [
              {
                id: messageTwo.id,
                to: {
                  name: otherUser.name,
                  bio: otherUser.bio,
                  username: otherUser.username,
                  id: otherUser.id,
                  email: otherUser.email,
                  phone: otherUser.phone,
                  image: jasmine.stringMatching(URL_REGEX),
                },
                from: {
                  name: user.name,
                  id: user.id,
                  email: user.email,
                  image: jasmine.stringMatching(URL_REGEX),
                },
                type: ConversationType.Friend,
                createdAt: messageTwo.createdAt,
                seenAt: messageTwo.seenAt,
                reactions: messageTwo.reactions,
                mimeType: messageTwo.mimeType,
                replyCount: messageTwo.replyCount,
                title: messageTwo.title,
                fetchUrl: jasmine.stringMatching(URL_REGEX),
                transcript: messageTwo.transcript,
              },
              {
                id: message.id,
                to: {
                  name: user.name,
                  id: user.id,
                  email: user.email,
                  image: jasmine.stringMatching(URL_REGEX),
                },
                from: {
                  name: otherUser.name,
                  bio: otherUser.bio,
                  username: otherUser.username,
                  id: otherUser.id,
                  email: otherUser.email,
                  phone: otherUser.phone,
                  image: jasmine.stringMatching(URL_REGEX),
                },
                type: ConversationType.Friend,
                createdAt: message.createdAt,
                seenAt: message.seenAt,
                reactions: message.reactions,
                mimeType: message.mimeType,
                replyCount: message.replyCount,
                title: message.title,
                fetchUrl: jasmine.stringMatching(URL_REGEX),
                transcript: message.transcript,
              },
            ],
          });
        } catch (error) {
          fail(error);
        }
      });
    });

    describe("when passed a 'limit' query param smaller than the number of entities", () => {
      it("returns a valid response", async () => {
        const params = { limit: 1 };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.get(`${baseUrl}/users/${userId}/friends/${otherUser.id}/messages`, { params, headers });

          expect(status).toBe(200);
          expect(data).toEqual({
            messages: [
              {
                id: messageTwo.id,
                to: {
                  name: otherUser.name,
                  bio: otherUser.bio,
                  username: otherUser.username,
                  id: otherUser.id,
                  email: otherUser.email,
                  phone: otherUser.phone,
                  image: jasmine.stringMatching(URL_REGEX),
                },
                from: {
                  name: user.name,
                  id: user.id,
                  email: user.email,
                  image: jasmine.stringMatching(URL_REGEX),
                },
                type: ConversationType.Friend,
                createdAt: messageTwo.createdAt,
                seenAt: messageTwo.seenAt,
                reactions: messageTwo.reactions,
                mimeType: messageTwo.mimeType,
                replyCount: messageTwo.replyCount,
                title: messageTwo.title,
                fetchUrl: jasmine.stringMatching(URL_REGEX),
                transcript: messageTwo.transcript,
              },
            ],
            lastEvaluatedKey: jasmine.any(String),
          });

          const callTwoParams = { limit: 1, exclusiveStartKey: data.lastEvaluatedKey };

          const { status: callTwoStatus, data: callTwoData } = await axios.get(`${baseUrl}/users/${userId}/friends/${otherUser.id}/messages`, { params: callTwoParams, headers });

          expect(callTwoStatus).toBe(200);
          expect(callTwoData).toEqual({
            messages: [
              {
                id: message.id,
                to: {
                  name: user.name,
                  id: user.id,
                  email: user.email,
                  image: jasmine.stringMatching(URL_REGEX),
                },
                from: {
                  name: otherUser.name,
                  bio: otherUser.bio,
                  username: otherUser.username,
                  id: otherUser.id,
                  email: otherUser.email,
                  phone: otherUser.phone,
                  image: jasmine.stringMatching(URL_REGEX),
                },
                type: ConversationType.Friend,
                createdAt: message.createdAt,
                seenAt: message.seenAt,
                reactions: message.reactions,
                mimeType: message.mimeType,
                replyCount: message.replyCount,
                title: message.title,
                fetchUrl: jasmine.stringMatching(URL_REGEX),
                transcript: message.transcript,
              },
            ],
          });
        } catch (error) {
          fail(error);
        }
      });
    });
  });

  describe("under error conditions", () => {
    const mockUserId = `${KeyPrefix.User}${generateRandomString(5)}`;

    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const headers = {};

        try {
          await axios.get(`${baseUrl}/users/${mockUserId}/friends/${otherUser.id}/messages`, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an id of a user other than the one in the acces token is passed in", () => {
      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.get(`${baseUrl}/users/${mockUserId}/friends/${otherUser.id}/messages`, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(403);
          expect(error.response?.statusText).toBe("Forbidden");
        }
      });
    });

    describe("when passed invalid parameters", () => {
      it("throws a 400 error with a valid structure", async () => {
        const params = { limit: "test" };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.get(`${baseUrl}/users/test/friends/test/messages`, { params, headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: {
                userId: "Failed constraint check for string: Must be a user id",
                friendId: "Failed constraint check for string: Must be a user id",
              },
              queryStringParameters: { limit: "Failed constraint check for string: Must be a whole number" },
            },
          });
        }
      });
    });
  });
});
