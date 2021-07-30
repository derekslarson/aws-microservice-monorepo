/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Role } from "@yac/util";
import axios from "axios";
import { documentClient, generateRandomString, ISO_DATE_REGEX, URL_REGEX } from "../../../../e2e/util";
import { ConversationType } from "../../src/enums/conversationType.enum";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { MessageMimeType } from "../../src/enums/message.mimeType.enum";
import { RawConversationUserRelationship } from "../../src/repositories/conversationUserRelationship.dynamo.repository";
import { RawMessage } from "../../src/repositories/message.dynamo.repository";
import { GroupId } from "../../src/types/groupId.type";
import { UserId } from "../../src/types/userId.type";
import { createRandomUser, createConversationUserRelationship, createMessage, CreateRandomUserOutput, getConversationUserRelationship, getMessage } from "../util";

describe("PATCH /users/{userId}/messages/{messageId} (Update Message by User Id)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;

  let otherUser: CreateRandomUserOutput["user"];

  beforeAll(async () => {
    ({ user: otherUser } = await createRandomUser());
  });

  describe("under normal conditions", () => {
    const mockConversationId: GroupId = `${KeyPrefix.GroupConversation}${generateRandomString(5)}`;

    let message: RawMessage;
    let conversationUserRelationship: RawConversationUserRelationship<ConversationType.Group>;

    beforeEach(async () => {
      ({ message } = await createMessage({ from: otherUser.id, conversationId: mockConversationId, conversationMemberIds: [ otherUser.id, userId ], replyCount: 0, mimeType: MessageMimeType.AudioMp3 }));

      ({ conversationUserRelationship } = await createConversationUserRelationship({
        type: ConversationType.Group,
        conversationId: mockConversationId,
        userId,
        role: Role.User,
        unreadMessageIds: [ message.id ],
      }));
    });

    describe("when passed a 'seen' value", () => {
      describe("when 'seen: true'", () => {
        const seen = true;

        beforeEach(async () => {
          ({ message } = await createMessage({ from: otherUser.id, conversationId: mockConversationId, conversationMemberIds: [ otherUser.id, userId ], replyCount: 0, mimeType: MessageMimeType.AudioMp3 }));

          ({ conversationUserRelationship } = await createConversationUserRelationship({
            type: ConversationType.Group,
            conversationId: mockConversationId,
            userId,
            role: Role.User,
            unreadMessageIds: [ message.id ],
          }));
        });

        it("returns a valid response", async () => {
          const headers = { Authorization: `Bearer ${accessToken}` };
          const body = { seen };

          try {
            const { status, data } = await axios.patch(`${baseUrl}/users/${userId}/messages/${message.id}`, body, { headers });

            expect(status).toBe(200);
            expect(data).toEqual({
              message: {
                id: message.id,
                from: message.from,
                conversationId: message.conversationId,
                createdAt: message.createdAt,
                seenAt: {
                  ...message.seenAt,
                  [userId]: jasmine.stringMatching(ISO_DATE_REGEX),
                },
                reactions: {},
                replyCount: message.replyCount,
                mimeType: message.mimeType,
                fetchUrl: jasmine.stringMatching(URL_REGEX),
                fromImage: jasmine.stringMatching(URL_REGEX),
              },
            });
          } catch (error) {
            console.log(JSON.stringify(error.response.data, null, 2));
            fail(error);
          }
        });

        it("updates the Message entity", async () => {
          const headers = { Authorization: `Bearer ${accessToken}` };
          const body = { seen };

          try {
            await axios.patch(`${baseUrl}/users/${userId}/messages/${message.id}`, body, { headers });

            const { message: messageEntity } = await getMessage({ messageId: message.id });

            expect(messageEntity).toEqual({
              ...message,
              seenAt: {
                ...message.seenAt,
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
            await axios.patch(`${baseUrl}/users/${userId}/messages/${message.id}`, body, { headers });

            const { conversationUserRelationship: conversationUserRelationshipEntity } = await getConversationUserRelationship({ userId, conversationId: mockConversationId });

            const { unreadMessages, ...updatedConversationUserRelationship } = conversationUserRelationship;

            expect(conversationUserRelationshipEntity).toEqual(updatedConversationUserRelationship);
          } catch (error) {
            fail(error);
          }
        });
      });

      describe("when 'seen: false'", () => {
        const seen = false;

        beforeEach(async () => {
          ({ message } = await createMessage({ from: otherUser.id, conversationId: mockConversationId, conversationMemberIds: [ otherUser.id, userId ], replyCount: 0, mimeType: MessageMimeType.AudioMp3, markSeenByAll: true }));

          ({ conversationUserRelationship } = await createConversationUserRelationship({
            type: ConversationType.Group,
            conversationId: mockConversationId,
            userId,
            role: Role.User,
          }));
        });

        it("returns a valid response", async () => {
          const headers = { Authorization: `Bearer ${accessToken}` };
          const body = { seen };

          try {
            const { status, data } = await axios.patch(`${baseUrl}/users/${userId}/messages/${message.id}`, body, { headers });

            expect(status).toBe(200);
            expect(data).toEqual({
              message: {
                id: message.id,
                from: message.from,
                conversationId: message.conversationId,
                createdAt: message.createdAt,
                seenAt: {
                  ...message.seenAt,
                  [userId]: null,
                },
                reactions: {},
                replyCount: message.replyCount,
                mimeType: message.mimeType,
                fetchUrl: jasmine.stringMatching(URL_REGEX),
                fromImage: jasmine.stringMatching(URL_REGEX),
              },
            });
          } catch (error) {
            fail(error);
          }
        });

        it("updates the Message entity", async () => {
          const headers = { Authorization: `Bearer ${accessToken}` };
          const body = { seen };

          try {
            await axios.patch(`${baseUrl}/users/${userId}/messages/${message.id}`, body, { headers });

            const { message: messageEntity } = await getMessage({ messageId: message.id });

            expect(messageEntity).toEqual({
              ...message,
              seenAt: {
                ...message.seenAt,
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
            await axios.patch(`${baseUrl}/users/${userId}/messages/${message.id}`, body, { headers });

            const { conversationUserRelationship: conversationUserRelationshipEntity } = await getConversationUserRelationship({ userId, conversationId: mockConversationId });

            expect(conversationUserRelationshipEntity).toEqual({
              ...conversationUserRelationship,
              unreadMessages: documentClient.createSet([ message.id ]),
            });
          } catch (error) {
            fail(error);
          }
        });
      });
    });

    describe("when passed a 'reactions' value", () => {
      const mockReaction = "thumbs_up";

      describe("when 'reactions[0].action: \"add\"'", () => {
        beforeEach(async () => {
          ({ message } = await createMessage({ from: otherUser.id, conversationId: mockConversationId, conversationMemberIds: [ otherUser.id, userId ], replyCount: 0, mimeType: MessageMimeType.AudioMp3 }));

          ({ conversationUserRelationship } = await createConversationUserRelationship({
            type: ConversationType.Group,
            conversationId: mockConversationId,
            userId,
            role: Role.User,
            unreadMessageIds: [ message.id ],
          }));
        });

        it("returns a valid response", async () => {
          const headers = { Authorization: `Bearer ${accessToken}` };
          const body = { reactions: [ { reaction: mockReaction, action: "add" } ] };

          try {
            const { status, data } = await axios.patch(`${baseUrl}/users/${userId}/messages/${message.id}`, body, { headers });

            expect(status).toBe(200);
            expect(data).toEqual({
              message: {
                id: message.id,
                from: message.from,
                conversationId: message.conversationId,
                createdAt: message.createdAt,
                seenAt: message.seenAt,
                reactions: {
                  ...message.reactions,
                  [mockReaction]: [ userId ],
                },
                replyCount: message.replyCount,
                mimeType: message.mimeType,
                fetchUrl: jasmine.stringMatching(URL_REGEX),
                fromImage: jasmine.stringMatching(URL_REGEX),
              },
            });
          } catch (error) {
            fail(error);
          }
        });

        it("updates the Message entity", async () => {
          const headers = { Authorization: `Bearer ${accessToken}` };
          const body = { reactions: [ { reaction: mockReaction, action: "add" } ] };

          try {
            await axios.patch(`${baseUrl}/users/${userId}/messages/${message.id}`, body, { headers });

            const { message: messageEntity } = await getMessage({ messageId: message.id });

            expect(messageEntity).toEqual({
              ...message,
              reactions: {
                ...message.reactions,
                [mockReaction]: documentClient.createSet([ userId ]),
              },
            });
          } catch (error) {
            fail(error);
          }
        });
      });

      describe("when reactions[0].action = 'remove'", () => {
        beforeEach(async () => {
          ({ message } = await createMessage({
            from: otherUser.id,
            conversationId: mockConversationId,
            conversationMemberIds: [ otherUser.id, userId ],
            replyCount: 0,
            mimeType: MessageMimeType.AudioMp3,
            reactions: { [mockReaction]: [ userId ] },
          }));

          ({ conversationUserRelationship } = await createConversationUserRelationship({
            type: ConversationType.Group,
            conversationId: mockConversationId,
            userId,
            role: Role.User,
            unreadMessageIds: [ message.id ],
          }));
        });

        it("returns a valid response", async () => {
          const headers = { Authorization: `Bearer ${accessToken}` };
          const body = { reactions: [ { reaction: mockReaction, action: "remove" } ] };

          try {
            const { status, data } = await axios.patch(`${baseUrl}/users/${userId}/messages/${message.id}`, body, { headers });

            expect(status).toBe(200);
            expect(data).toEqual({
              message: {
                id: message.id,
                from: message.from,
                conversationId: message.conversationId,
                createdAt: message.createdAt,
                seenAt: message.seenAt,
                reactions: {},
                replyCount: message.replyCount,
                mimeType: message.mimeType,
                fetchUrl: jasmine.stringMatching(URL_REGEX),
                fromImage: jasmine.stringMatching(URL_REGEX),
              },
            });
          } catch (error) {
            fail(error);
          }
        });

        it("updates the Message entity", async () => {
          const headers = { Authorization: `Bearer ${accessToken}` };
          const body = { reactions: [ { reaction: mockReaction, action: "remove" } ] };

          try {
            await axios.patch(`${baseUrl}/users/${userId}/messages/${message.id}`, body, { headers });

            const { message: messageEntity } = await getMessage({ messageId: message.id });

            expect(messageEntity).toEqual({
              ...message,
              reactions: {},
            });
          } catch (error) {
            fail(error);
          }
        });
      });
    });
  });

  describe("under error conditions", () => {
    const mockMessageId = `${KeyPrefix.Message}${generateRandomString(5)}`;

    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const headers = {};
        const body = {};

        try {
          await axios.patch(`${baseUrl}/users/${userId}/messages/${mockMessageId}`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an id of a message that the user is not a member of the conversation is passed in", () => {
      const mockConversationId: GroupId = `${KeyPrefix.GroupConversation}${generateRandomString(5)}`;
      let message: RawMessage;

      beforeAll(async () => {
        ([ { message } ] = await Promise.all([
          createMessage({ from: otherUser.id, conversationId: mockConversationId, conversationMemberIds: [ userId ], replyCount: 0, mimeType: MessageMimeType.AudioMp3 }),
        ]));
      });

      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const body = {};

        try {
          await axios.patch(`${baseUrl}/users/${userId}/messages/${message.id}`, body, { headers });

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
        const body = { seen: "test", reactions: "test" };

        try {
          await axios.patch(`${baseUrl}/users/test/messages/test`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: {
                userId: "Failed constraint check for string: Must be a user id",
                messageId: "Failed constraint check for string: Must be a message id",
              },
              body: {
                seen: "Expected boolean, but was string",
                reactions: 'Expected { reaction: string; action: "add" | "remove"; }[], but was string',
              },
            },
          });
        }
      });
    });
  });
});
