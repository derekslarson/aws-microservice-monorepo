/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { FriendMessageUpdatedSnsMessage, Role } from "@yac/util";
import axios from "axios";
import { backoff, documentClient, generateRandomString, ISO_DATE_REGEX, URL_REGEX } from "../../../../e2e/util";
import { ConversationType } from "../../src/enums/conversationType.enum";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { MessageMimeType } from "../../src/enums/message.mimeType.enum";
import { FriendConversation, RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { RawConversationUserRelationship } from "../../src/repositories/conversationUserRelationship.dynamo.repository";
import { RawMessage } from "../../src/repositories/message.dynamo.repository";
import { UserId } from "../../src/types/userId.type";
import { createConversationUserRelationship, createFriendConversation, createMessage, CreateRandomUserOutput, deleteSnsEventsByTopicArn, getConversationUserRelationship, getMessage, getUser, createRandomUser, getSnsEventsByTopicArn } from "../util";

describe("PATCH /users/{userId}/friends/{friendId}/messages (Update Friend Messages by User Id)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;
  const friendMessageUpdatedSnsTopicArn = process.env["friend-message-updated-sns-topic-arn"] as string;

  describe("under normal conditions", () => {
    let fromUser: CreateRandomUserOutput["user"];
    let friendship: RawConversation<FriendConversation>;
    let message: RawMessage;
    let messageTwo: RawMessage;
    let conversationUserRelationship: RawConversationUserRelationship<ConversationType.Friend>;

    beforeEach(async () => {
      ({ user: fromUser } = await createRandomUser());
      ({ conversation: friendship } = await createFriendConversation({ userId, friendId: fromUser.id }));

      ([ { message }, { message: messageTwo } ] = await Promise.all([
        createMessage({ from: fromUser.id, conversationId: friendship.id, conversationMemberIds: [ userId, fromUser.id ], replyCount: 0, mimeType: MessageMimeType.AudioMp3 }),
        createMessage({ from: fromUser.id, conversationId: friendship.id, conversationMemberIds: [ userId, fromUser.id ], replyCount: 0, mimeType: MessageMimeType.AudioMp3 }),
      ]));

      ({ conversationUserRelationship } = await createConversationUserRelationship({
        type: ConversationType.Friend,
        conversationId: friendship.id,
        userId,
        role: Role.Admin,
        unreadMessageIds: [ message.id, messageTwo.id ],
      }));
    });

    describe("when passed a 'seen' value", () => {
      describe("when 'seen: true'", () => {
        const seen = true;

        it("returns a valid response", async () => {
          const headers = { Authorization: `Bearer ${accessToken}` };
          const body = { seen };

          try {
            const { status, data } = await axios.patch(`${baseUrl}/users/${userId}/friends/${fromUser.id}/messages`, body, { headers });

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
            await axios.patch(`${baseUrl}/users/${userId}/friends/${fromUser.id}/messages`, body, { headers });

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
            await axios.patch(`${baseUrl}/users/${userId}/friends/${fromUser.id}/messages`, body, { headers });

            const { conversationUserRelationship: conversationUserRelationshipEntity } = await getConversationUserRelationship({ userId, conversationId: friendship.id });

            const { unreadMessages, ...updatedConversationUserRelationship } = conversationUserRelationship;

            expect(conversationUserRelationshipEntity).toEqual(updatedConversationUserRelationship);
          } catch (error) {
            fail(error);
          }
        });

        it("publishes a valid SNS message", async () => {
          // clear the sns events table so the test can have a clean slate
          await deleteSnsEventsByTopicArn({ topicArn: friendMessageUpdatedSnsTopicArn });

          const headers = { Authorization: `Bearer ${accessToken}` };
          const body = { seen };

          try {
            await axios.patch(`${baseUrl}/users/${userId}/friends/${fromUser.id}/messages`, body, { headers });

            const [ { user: toUser }, { message: updatedMessage }, { message: updatedMessageTwo } ] = await Promise.all([
              getUser({ userId }),
              getMessage({ messageId: message.id }),
              getMessage({ messageId: messageTwo.id }),
            ]);

            if (!toUser || !updatedMessage || !updatedMessageTwo) {
              throw new Error("necessary records not created");
            }

            // wait till the events have been fired
            const { snsEvents } = await backoff(
              () => getSnsEventsByTopicArn<FriendMessageUpdatedSnsMessage>({ topicArn: friendMessageUpdatedSnsTopicArn }),
              (response) => response.snsEvents.length === 2,
            );

            expect(snsEvents.length).toBe(2);
            expect(snsEvents).toEqual(jasmine.arrayContaining([
              jasmine.objectContaining({
                message: {
                  message: {
                    id: updatedMessage.id,
                    to: {
                      id: toUser.id,
                      email: toUser.email,
                      username: toUser.username,
                      phone: toUser.phone,
                      realName: toUser.realName,
                      image: jasmine.stringMatching(URL_REGEX),
                    },
                    from: {
                      id: fromUser.id,
                      email: fromUser.email,
                      username: fromUser.username,
                      phone: fromUser.phone,
                      realName: fromUser.realName,
                      image: jasmine.stringMatching(URL_REGEX),
                    },
                    type: ConversationType.Friend,
                    createdAt: updatedMessage.createdAt,
                    seenAt: updatedMessage.seenAt,
                    reactions: updatedMessage.reactions,
                    replyCount: 0,
                    mimeType: updatedMessage.mimeType,
                    transcript: updatedMessage.transcript,
                    fetchUrl: jasmine.stringMatching(URL_REGEX),
                  },
                },
              }),
              jasmine.objectContaining({
                message: {
                  message: {
                    id: updatedMessageTwo.id,
                    to: {
                      id: toUser.id,
                      email: toUser.email,
                      username: toUser.username,
                      phone: toUser.phone,
                      realName: toUser.realName,
                      image: jasmine.stringMatching(URL_REGEX),
                    },
                    from: {
                      id: fromUser.id,
                      email: fromUser.email,
                      username: fromUser.username,
                      phone: fromUser.phone,
                      realName: fromUser.realName,
                      image: jasmine.stringMatching(URL_REGEX),
                    },
                    type: ConversationType.Friend,
                    createdAt: updatedMessageTwo.createdAt,
                    seenAt: updatedMessageTwo.seenAt,
                    reactions: updatedMessageTwo.reactions,
                    replyCount: 0,
                    mimeType: updatedMessageTwo.mimeType,
                    transcript: updatedMessageTwo.transcript,
                    fetchUrl: jasmine.stringMatching(URL_REGEX),
                  },
                },
              }),
            ]));
          } catch (error) {
            fail(error);
          }
        }, 45000);
      });

      describe("when 'seen: false'", () => {
        const seen = false;

        it("returns a valid response", async () => {
          const headers = { Authorization: `Bearer ${accessToken}` };
          const body = { seen };

          try {
            const { status, data } = await axios.patch(`${baseUrl}/users/${userId}/friends/${fromUser.id}/messages`, body, { headers });

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
            await axios.patch(`${baseUrl}/users/${userId}/friends/${fromUser.id}/messages`, body, { headers });

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
            await axios.patch(`${baseUrl}/users/${userId}/friends/${fromUser.id}/messages`, body, { headers });

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
    const mockUserId = `${KeyPrefix.User}${generateRandomString(5)}`;
    const mockUserIdTwo = `${KeyPrefix.User}${generateRandomString(5)}`;

    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const headers = {};
        const body = { seen: true };

        try {
          await axios.patch(`${baseUrl}/users/${userId}/friends/${mockUserId}/messages`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an id of a user other than the one in the auth token is passed in", () => {
      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const body = { seen: true };

        try {
          await axios.patch(`${baseUrl}/users/${mockUserId}/friends/${mockUserIdTwo}/messages`, body, { headers });

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
