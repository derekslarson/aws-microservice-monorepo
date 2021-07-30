/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Role } from "@yac/util";
import axios from "axios";
import { documentClient, generateRandomString, ISO_DATE_REGEX } from "../../../../e2e/util";
import { ConversationType } from "../../src/enums/conversationType.enum";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { MessageMimeType } from "../../src/enums/message.mimeType.enum";
import { FriendConversation, RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { RawConversationUserRelationship } from "../../src/repositories/conversationUserRelationship.dynamo.repository";
import { RawMessage } from "../../src/repositories/message.dynamo.repository";
import { UserId } from "../../src/types/userId.type";
import { createConversationUserRelationship, createFriendConversation, createMessage, getConversationUserRelationship, getMessage } from "../util";

describe("PATCH /users/{userId}/friends/{friendId}/messages (Update Friend Messages by User Id)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;

  const mockUserId: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;

  describe("under normal conditions", () => {
    describe("when passed a 'seen' value", () => {
      describe("when 'seen: true'", () => {
        const seen = true;

        let friendship: RawConversation<FriendConversation>;
        let message: RawMessage;
        let messageTwo: RawMessage;

        let conversationUserRelationship: RawConversationUserRelationship<ConversationType.Friend>;

        beforeEach(async () => {
          ({ conversation: friendship } = await createFriendConversation({ userId, friendId: mockUserId }));

          ([ { message }, { message: messageTwo } ] = await Promise.all([
            createMessage({ from: mockUserId, conversationId: friendship.id, conversationMemberIds: [ userId, mockUserId ], replyCount: 0, mimeType: MessageMimeType.AudioMp3 }),
            createMessage({ from: mockUserId, conversationId: friendship.id, conversationMemberIds: [ userId, mockUserId ], replyCount: 0, mimeType: MessageMimeType.AudioMp3 }),
          ]));

          ({ conversationUserRelationship } = await createConversationUserRelationship({
            type: ConversationType.Friend,
            conversationId: friendship.id,
            userId,
            role: Role.Admin,
            unreadMessageIds: [ message.id, messageTwo.id ],
          }));
        });

        it("returns a valid response", async () => {
          const headers = { Authorization: `Bearer ${accessToken}` };
          const body = { seen };

          try {
            const { status, data } = await axios.patch(`${baseUrl}/users/${userId}/friends/${mockUserId}/messages`, body, { headers });

            expect(status).toBe(200);
            expect(data).toEqual({ message: "Friend messages updated." });
          } catch (error) {
            fail(error);
          }
        });

        it("updates the Message entities", async () => {
          const headers = { Authorization: `Bearer ${accessToken}` };
          const body = { seen };

          try {
            await axios.patch(`${baseUrl}/users/${userId}/friends/${mockUserId}/messages`, body, { headers });

            const [ { message: messageEntity }, { message: messageTwoEntity } ] = await Promise.all([
              getMessage({ messageId: message.id }),
              getMessage({ messageId: messageTwo.id }),
            ]);

            expect(messageEntity).toEqual({
              ...message,
              seenAt: {
                ...message.seenAt,
                [userId]: jasmine.stringMatching(ISO_DATE_REGEX),
              },
            });

            expect(messageTwoEntity).toEqual({
              ...messageTwo,
              seenAt: {
                ...messageTwo.seenAt,
                [userId]: jasmine.stringMatching(ISO_DATE_REGEX),
              },
            });
          } catch (error) {
            fail(error);
          }
        });

        it("updates the ConversationUserRelationship entity", async () => {
          const headers = { Authorization: `Bearer ${accessToken}` };
          const body = { seen };

          try {
            await axios.patch(`${baseUrl}/users/${userId}/friends/${mockUserId}/messages`, body, { headers });

            const { conversationUserRelationship: conversationUserRelationshipEntity } = await getConversationUserRelationship({ userId, conversationId: friendship.id });

            const { unreadMessages, ...updatedConversationUserRelationship } = conversationUserRelationship;

            expect(conversationUserRelationshipEntity).toEqual(updatedConversationUserRelationship);
          } catch (error) {
            fail(error);
          }
        });
      });

      describe("when 'seen: false'", () => {
        const seen = false;

        let friendship: RawConversation<FriendConversation>;
        let message: RawMessage;
        let messageTwo: RawMessage;

        let conversationUserRelationship: RawConversationUserRelationship<ConversationType.Friend>;

        beforeEach(async () => {
          ({ conversation: friendship } = await createFriendConversation({ userId, friendId: mockUserId }));

          ([ { message }, { message: messageTwo } ] = await Promise.all([
            createMessage({ from: mockUserId, conversationId: friendship.id, conversationMemberIds: [ userId, mockUserId ], replyCount: 0, mimeType: MessageMimeType.AudioMp3 }),
            createMessage({ from: mockUserId, conversationId: friendship.id, conversationMemberIds: [ userId, mockUserId ], replyCount: 0, mimeType: MessageMimeType.AudioMp3 }),
          ]));

          ({ conversationUserRelationship } = await createConversationUserRelationship({
            type: ConversationType.Friend,
            conversationId: friendship.id,
            userId,
            role: Role.Admin,
            unreadMessageIds: [ message.id, messageTwo.id ],
          }));
        });

        it("returns a valid response", async () => {
          const headers = { Authorization: `Bearer ${accessToken}` };
          const body = { seen };

          try {
            const { status, data } = await axios.patch(`${baseUrl}/users/${userId}/friends/${mockUserId}/messages`, body, { headers });

            expect(status).toBe(200);
            expect(data).toEqual({ message: "Friend messages updated." });
          } catch (error) {
            fail(error);
          }
        });

        it("updates the Message entity", async () => {
          const headers = { Authorization: `Bearer ${accessToken}` };
          const body = { seen };

          try {
            await axios.patch(`${baseUrl}/users/${userId}/friends/${mockUserId}/messages`, body, { headers });

            const [ { message: messageEntity }, { message: messageTwoEntity } ] = await Promise.all([
              getMessage({ messageId: message.id }),
              getMessage({ messageId: messageTwo.id }),
            ]);

            expect(messageEntity).toEqual({
              ...message,
              seenAt: {
                ...message.seenAt,
                [userId]: null,
              },
            });

            expect(messageTwoEntity).toEqual({
              ...messageTwo,
              seenAt: {
                ...messageTwo.seenAt,
                [userId]: null,
              },
            });
          } catch (error) {
            fail(error);
          }
        });

        it("updates the ConversationUserRelationship entity", async () => {
          const headers = { Authorization: `Bearer ${accessToken}` };
          const body = { seen };

          try {
            await axios.patch(`${baseUrl}/users/${userId}/friends/${mockUserId}/messages`, body, { headers });

            const { conversationUserRelationship: conversationUserRelationshipEntity } = await getConversationUserRelationship({ userId, conversationId: friendship.id });

            expect(conversationUserRelationshipEntity).toEqual({
              ...conversationUserRelationship,
              unreadMessages: documentClient.createSet([ message.id, messageTwo.id ].sort()),
            });
          } catch (error) {
            fail(error);
          }
        });
      });
    });
  });

  describe("under error conditions", () => {
    const mockUserIdTwo = `${KeyPrefix.User}${generateRandomString(5)}`;

    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const headers = {};
        const body = { seen: true };

        try {
          await axios.patch(`${baseUrl}/users/${mockUserIdTwo}/friends/${mockUserId}/messages`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an id of a group the user is not a member of is passed in", () => {
      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const body = { seen: true };

        try {
          await axios.patch(`${baseUrl}/users/${mockUserIdTwo}/friends/${mockUserId}/messages`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(403);
          expect(error.response?.statusText).toBe("Forbidden");
        }
      });
    });

    describe("when passed invalid parameters", () => {
      it("throws a 400 error with a valid structure", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const body = { seen: "test" };

        try {
          await axios.patch(`${baseUrl}/users/test/friends/test/messages`, body, { headers });

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
              body: { seen: "Expected boolean, but was string" },
            },
          });
        }
      });
    });
  });
});
