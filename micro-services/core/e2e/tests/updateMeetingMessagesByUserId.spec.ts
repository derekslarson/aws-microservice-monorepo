/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { MeetingMessageUpdatedSnsMessage, Role } from "@yac/util";
import axios from "axios";
import { backoff, documentClient, generateRandomString, ISO_DATE_REGEX, URL_REGEX } from "../../../../e2e/util";
import { ConversationType } from "../../src/enums/conversationType.enum";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { MessageMimeType } from "../../src/enums/message.mimeType.enum";
import { MeetingConversation, RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { RawConversationUserRelationship } from "../../src/repositories/conversationUserRelationship.dynamo.repository";
import { RawMessage } from "../../src/repositories/message.dynamo.repository";
import { MeetingId } from "../../src/types/meetingId.type";
import { UserId } from "../../src/types/userId.type";
import { createConversationUserRelationship, createMeetingConversation, createMessage, createRandomUser, CreateRandomUserOutput, deleteSnsEventsByTopicArn, getConversationUserRelationship, getMessage, getSnsEventsByTopicArn } from "../util";

describe("PATCH /users/{userId}/meetings/{meetingId}/messages (Update Meeting Messages by User Id)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;
  const meetingMessageUpdatedSnsTopicArn = process.env["meeting-message-updated-sns-topic-arn"] as string;

  describe("under normal conditions", () => {
    let fromUser: CreateRandomUserOutput["user"];
    let meeting: RawConversation<MeetingConversation>;
    let message: RawMessage;
    let messageTwo: RawMessage;

    let conversationUserRelationship: RawConversationUserRelationship<ConversationType>;

    beforeEach(async () => {
      ([ { user: fromUser }, { conversation: meeting } ] = await Promise.all([
        createRandomUser(),
        createMeetingConversation({ createdBy: userId, name: generateRandomString(5), dueDate: new Date().toISOString() }),
      ]));

      ({ conversation: meeting } = await createMeetingConversation({ createdBy: userId, name: generateRandomString(5), dueDate: new Date().toISOString() }));

      ([ { message }, { message: messageTwo } ] = await Promise.all([
        createMessage({ from: fromUser.id, conversationId: meeting.id, conversationMemberIds: [ userId, fromUser.id ], replyCount: 0, mimeType: MessageMimeType.AudioMp3, title: generateRandomString(5) }),
        createMessage({ from: fromUser.id, conversationId: meeting.id, conversationMemberIds: [ userId, fromUser.id ], replyCount: 0, mimeType: MessageMimeType.AudioMp3, title: generateRandomString(5) }),
      ]));

      ({ conversationUserRelationship } = await createConversationUserRelationship({
        type: ConversationType.Meeting,
        conversationId: meeting.id,
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
            const { status, data } = await axios.patch(`${baseUrl}/users/${userId}/meetings/${meeting.id}/messages`, body, { headers });

            expect(status).toBe(200);
            expect(data).toEqual({ message: "Meeting messages updated." });
          } catch (error) {
            fail(error);
          }
        });

        it("updates the Message entities", async () => {
          const headers = { Authorization: `Bearer ${accessToken}` };
          const body = { seen };

          try {
            await axios.patch(`${baseUrl}/users/${userId}/meetings/${meeting.id}/messages`, body, { headers });

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
            await axios.patch(`${baseUrl}/users/${userId}/meetings/${meeting.id}/messages`, body, { headers });

            const { conversationUserRelationship: conversationUserRelationshipEntity } = await getConversationUserRelationship({ userId, conversationId: meeting.id });

            const { unreadMessages, ...updatedConversationUserRelationship } = conversationUserRelationship;

            expect(conversationUserRelationshipEntity).toEqual(updatedConversationUserRelationship);
          } catch (error) {
            fail(error);
          }
        });

        it("publishes a valid SNS message", async () => {
          // clear the sns events table so the test can have a clean slate
          await deleteSnsEventsByTopicArn({ topicArn: meetingMessageUpdatedSnsTopicArn });

          const headers = { Authorization: `Bearer ${accessToken}` };
          const body = { seen };

          try {
            await axios.patch(`${baseUrl}/users/${userId}/meetings/${meeting.id}/messages`, body, { headers });

            const [ { message: updatedMessage }, { message: updatedMessageTwo } ] = await Promise.all([
              getMessage({ messageId: message.id }),
              getMessage({ messageId: messageTwo.id }),
            ]);

            if (!updatedMessage || !updatedMessageTwo) {
              throw new Error("necessary records not created");
            }

            // wait till the events have been fired
            const { snsEvents } = await backoff(
              () => getSnsEventsByTopicArn<MeetingMessageUpdatedSnsMessage>({ topicArn: meetingMessageUpdatedSnsTopicArn }),
              (response) => response.snsEvents.length === 2,
            );

            expect(snsEvents.length).toBe(2);

            expect(snsEvents).toEqual(jasmine.arrayContaining([
              jasmine.objectContaining({
                message: {
                  meetingMemberIds: [ userId ],
                  message: {
                    id: updatedMessage.id,
                    to: {
                      id: meeting.id,
                      name: meeting.name,
                      createdBy: meeting.createdBy,
                      createdAt: meeting.createdAt,
                      dueDate: meeting.dueDate,
                      type: meeting.type,
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
                    type: ConversationType.Meeting,
                    createdAt: updatedMessage.createdAt,
                    seenAt: updatedMessage.seenAt,
                    reactions: updatedMessage.reactions,
                    replyCount: 0,
                    title: updatedMessage.title,
                    mimeType: updatedMessage.mimeType,
                    transcript: updatedMessage.transcript,
                    fetchUrl: jasmine.stringMatching(URL_REGEX),
                  },
                },
              }),
              jasmine.objectContaining({
                message: {
                  meetingMemberIds: [ userId ],
                  message: {
                    id: updatedMessageTwo.id,
                    to: {
                      id: meeting.id,
                      name: meeting.name,
                      createdBy: meeting.createdBy,
                      createdAt: meeting.createdAt,
                      dueDate: meeting.dueDate,
                      type: meeting.type,
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
                    type: ConversationType.Meeting,
                    createdAt: updatedMessageTwo.createdAt,
                    seenAt: updatedMessageTwo.seenAt,
                    reactions: updatedMessageTwo.reactions,
                    replyCount: 0,
                    title: updatedMessageTwo.title,
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
            const { status, data } = await axios.patch(`${baseUrl}/users/${userId}/meetings/${meeting.id}/messages`, body, { headers });

            expect(status).toBe(200);
            expect(data).toEqual({ message: "Meeting messages updated." });
          } catch (error) {
            fail(error);
          }
        });

        it("updates the Message entity", async () => {
          const headers = { Authorization: `Bearer ${accessToken}` };
          const body = { seen };

          try {
            await axios.patch(`${baseUrl}/users/${userId}/meetings/${meeting.id}/messages`, body, { headers });

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
            await axios.patch(`${baseUrl}/users/${userId}/meetings/${meeting.id}/messages`, body, { headers });

            const { conversationUserRelationship: conversationUserRelationshipEntity } = await getConversationUserRelationship({ userId, conversationId: meeting.id });

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
    const mockMeetingId: MeetingId = `${KeyPrefix.MeetingConversation}${generateRandomString(5)}`;

    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const headers = {};
        const body = { seen: true };

        try {
          await axios.patch(`${baseUrl}/users/${userId}/meetings/${mockMeetingId}/messages`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an id of a meeting the user is not a member of is passed in", () => {
      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const body = { seen: true };

        try {
          await axios.patch(`${baseUrl}/users/${userId}/meetings/${mockMeetingId}/messages`, body, { headers });

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
          await axios.patch(`${baseUrl}/users/test/meetings/test/messages`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: {
                userId: "Failed constraint check for string: Must be a user id",
                meetingId: "Failed constraint check for string: Must be a meeting id",
              },
              body: { seen: "Expected boolean, but was string" },
            },
          });
        }
      });
    });
  });
});
