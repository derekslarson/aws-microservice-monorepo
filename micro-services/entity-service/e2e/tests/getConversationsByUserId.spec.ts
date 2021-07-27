/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Role } from "@yac/core";
import axios from "axios";
import { generateRandomString, getAccessTokenByEmail, URL_REGEX, wait } from "../../../../e2e/util";
import { ConversationType } from "../../src/enums/conversationType.enum";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { MessageMimeType } from "../../src/enums/message.mimeType.enum";
import { FriendConversation, GroupConversation, MeetingConversation, RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { RawConversationUserRelationship } from "../../src/repositories/conversationUserRelationship.dynamo.repository";
import { RawMessage } from "../../src/repositories/message.dynamo.repository";
import { UserId } from "../../src/types/userId.type";
import { createConversationUserRelationship, createFriendConversation, createGroupConversation, createMeetingConversation, createMessage, createRandomUser, CreateRandomUserOutput } from "../util";

describe("GET /users/{userId}/conversations (Get Conversations by User Id)", () => {
  const baseUrl = process.env.baseUrl as string;

  describe("under normal conditions", () => {
    let user: CreateRandomUserOutput["user"];
    let otherUser: CreateRandomUserOutput["user"];
    let accessToken: string;

    let meeting: RawConversation<MeetingConversation>;
    let meetingUserRelationship: RawConversationUserRelationship<ConversationType.Meeting>;

    let meetingTwo: RawConversation<MeetingConversation>;
    let meetingUserRelationshipTwo: RawConversationUserRelationship<ConversationType.Meeting>;

    let group: RawConversation<GroupConversation>;
    let groupUserRelationship: RawConversationUserRelationship<ConversationType.Group>;

    let friendship: RawConversation<FriendConversation>;
    let friendshipUserRelationship: RawConversationUserRelationship<ConversationType.Friend>;

    let message: RawMessage;

    beforeAll(async () => {
      // We have to fetch a new base user and access token here to prevent bleed over from other tests
      ([ { user }, { user: otherUser } ] = await Promise.all([
        createRandomUser(),
        createRandomUser(),
      ]));

      // we have to wait for the user to exist in cognito. This could be replaced with exponential backoff when calling getAccesTokenByEmail
      await wait(6000);

      ([ { accessToken }, { conversation: meeting }, { conversation: meetingTwo }, { conversation: group }, { conversation: friendship } ] = await Promise.all([
        getAccessTokenByEmail(user.email),
        createMeetingConversation({ createdBy: user.id, name: generateRandomString(5), dueDate: new Date("12/25/2021").toISOString(), teamId: `${KeyPrefix.Team}${generateRandomString(5)}` }),
        createMeetingConversation({ createdBy: otherUser.id, name: generateRandomString(5), dueDate: new Date("12/26/2021").toISOString() }),
        createGroupConversation({ createdBy: otherUser.id, name: generateRandomString(5) }),
        createFriendConversation({ userId: user.id, friendId: otherUser.id }),
      ]));

      ({ message } = await createMessage({ from: otherUser.id, conversationId: group.id, conversationMemberIds: [ user.id, otherUser.id ], mimeType: MessageMimeType.AudioMp3 }));

      // We need to create the relationships in sequence, so that we can be sure of the return order in the test
      ({ conversationUserRelationship: meetingUserRelationship } = await createConversationUserRelationship({ type: ConversationType.Meeting, conversationId: meeting.id, userId: user.id, role: Role.Admin, dueDate: meeting.dueDate }));
      ({ conversationUserRelationship: meetingUserRelationshipTwo } = await createConversationUserRelationship({ type: ConversationType.Meeting, conversationId: meetingTwo.id, userId: user.id, role: Role.User, dueDate: meetingTwo.dueDate }));
      ({ conversationUserRelationship: groupUserRelationship } = await createConversationUserRelationship({ type: ConversationType.Group, conversationId: group.id, userId: user.id, role: Role.User, recentMessageId: message.id, unreadMessageIds: [ message.id ] }));
      ({ conversationUserRelationship: friendshipUserRelationship } = await createConversationUserRelationship({ type: ConversationType.Friend, conversationId: friendship.id, userId: user.id, role: Role.Admin }));
    });

    describe("when not passed any query params", () => {
      fit("returns a valid response", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.get(`${baseUrl}/users/${user.id}/conversations`, { headers });

          console.log(JSON.stringify(data, null, 2));
          expect(status).toBe(200);
          expect(data).toEqual({
            conversations: [
              {
                createdAt: friendship.createdAt,
                id: friendship.id,
                type: friendship.type,
                updatedAt: friendshipUserRelationship.updatedAt,
                unreadMessages: 0,
                role: friendshipUserRelationship.role,
                image: jasmine.stringMatching(URL_REGEX),
              },
              {
                createdAt: group.createdAt,
                id: group.id,
                createdBy: group.createdBy,
                name: group.name,
                type: group.type,
                updatedAt: groupUserRelationship.updatedAt,
                role: groupUserRelationship.role,
                unreadMessages: 1,
                image: jasmine.stringMatching(URL_REGEX),
                recentMessage: {
                  createdAt: message.createdAt,
                  replyCount: message.replyCount,
                  conversationId: message.conversationId,
                  seenAt: message.seenAt,
                  reactions: message.reactions,
                  from: message.from,
                  fromImage: jasmine.stringMatching(URL_REGEX),
                  id: message.id,
                  mimeType: message.mimeType,
                  fetchUrl: jasmine.stringMatching(URL_REGEX),
                },
              },
              {
                dueDate: meetingTwo.dueDate,
                createdAt: meetingTwo.createdAt,
                id: meetingTwo.id,
                createdBy: meetingTwo.createdBy,
                name: meetingTwo.name,
                type: meetingTwo.type,
                updatedAt: meetingUserRelationshipTwo.updatedAt,
                unreadMessages: 0,
                role: meetingUserRelationshipTwo.role,
                image: jasmine.stringMatching(URL_REGEX),
              },
              {
                dueDate: meeting.dueDate,
                createdAt: meeting.createdAt,
                id: meeting.id,
                createdBy: meeting.createdBy,
                teamId: meeting.teamId,
                name: meeting.name,
                type: meeting.type,
                updatedAt: meetingUserRelationship.updatedAt,
                unreadMessages: 0,
                role: meetingUserRelationship.role,
                image: jasmine.stringMatching(URL_REGEX),
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
        const params = { limit: 2 };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.get(`${baseUrl}/users/${user.id}/conversations`, { params, headers });

          expect(status).toBe(200);
          expect(data).toEqual({
            conversations: [
              {
                createdAt: friendship.createdAt,
                id: friendship.id,
                type: friendship.type,
                updatedAt: friendshipUserRelationship.updatedAt,
                unreadMessages: 0,
                role: friendshipUserRelationship.role,
              },
              {
                createdAt: group.createdAt,
                id: group.id,
                createdBy: group.createdBy,
                name: group.name,
                type: group.type,
                updatedAt: groupUserRelationship.updatedAt,
                role: groupUserRelationship.role,
                unreadMessages: 1,
                recentMessage: {
                  createdAt: message.createdAt,
                  replyCount: message.replyCount,
                  conversationId: message.conversationId,
                  seenAt: message.seenAt,
                  reactions: message.reactions,
                  from: message.from,
                  id: message.id,
                  mimeType: message.mimeType,
                  fetchUrl: jasmine.stringMatching(URL_REGEX),
                },
              },
            ],
            lastEvaluatedKey: jasmine.any(String),
          });

          const callTwoParams = { limit: 2, exclusiveStartKey: data.lastEvaluatedKey };

          const { status: callTwoStatus, data: callTwoData } = await axios.get(`${baseUrl}/users/${user.id}/conversations`, { params: callTwoParams, headers });

          expect(callTwoStatus).toBe(200);
          expect(callTwoData).toEqual({
            conversations: [
              {
                dueDate: meetingTwo.dueDate,
                createdAt: meetingTwo.createdAt,
                id: meetingTwo.id,
                createdBy: meetingTwo.createdBy,
                name: meetingTwo.name,
                type: meetingTwo.type,
                updatedAt: meetingUserRelationshipTwo.updatedAt,
                unreadMessages: 0,
                role: meetingUserRelationshipTwo.role,
              },
              {
                dueDate: meeting.dueDate,
                createdAt: meeting.createdAt,
                id: meeting.id,
                createdBy: meeting.createdBy,
                teamId: meeting.teamId,
                name: meeting.name,
                type: meeting.type,
                updatedAt: meetingUserRelationship.updatedAt,
                unreadMessages: 0,
                role: meetingUserRelationship.role,
              },
            ],
          });
        } catch (error) {
          fail(error);
        }
      });
    });

    describe("when passed a 'type=friend' query param", () => {
      it("returns a valid response", async () => {
        const params = { type: "friend" };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.get(`${baseUrl}/users/${user.id}/conversations`, { params, headers });

          expect(status).toBe(200);
          expect(data).toEqual({
            conversations: [
              {
                createdAt: friendship.createdAt,
                id: friendship.id,
                type: friendship.type,
                updatedAt: friendshipUserRelationship.updatedAt,
                unreadMessages: 0,
                role: friendshipUserRelationship.role,
              },
            ],
          });
        } catch (error) {
          fail(error);
        }
      });
    });

    describe("when passed a 'type=group' query param", () => {
      it("returns a valid response", async () => {
        const params = { type: "group" };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.get(`${baseUrl}/users/${user.id}/conversations`, { params, headers });

          expect(status).toBe(200);
          expect(data).toEqual({
            conversations: [
              {
                createdAt: group.createdAt,
                id: group.id,
                createdBy: group.createdBy,
                name: group.name,
                type: group.type,
                updatedAt: groupUserRelationship.updatedAt,
                role: groupUserRelationship.role,
                unreadMessages: 1,
                recentMessage: {
                  createdAt: message.createdAt,
                  replyCount: message.replyCount,
                  conversationId: message.conversationId,
                  seenAt: message.seenAt,
                  reactions: message.reactions,
                  from: message.from,
                  id: message.id,
                  mimeType: message.mimeType,
                  fetchUrl: jasmine.stringMatching(URL_REGEX),
                },
              },
            ],
          });
        } catch (error) {
          fail(error);
        }
      });
    });

    describe("when passed a 'type=meeting' query param", () => {
      it("returns a valid response", async () => {
        const params = { type: "meeting" };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.get(`${baseUrl}/users/${user.id}/conversations`, { params, headers });

          expect(status).toBe(200);
          expect(data).toEqual({
            conversations: [
              {
                dueDate: meetingTwo.dueDate,
                createdAt: meetingTwo.createdAt,
                id: meetingTwo.id,
                createdBy: meetingTwo.createdBy,
                name: meetingTwo.name,
                type: meetingTwo.type,
                updatedAt: meetingUserRelationshipTwo.updatedAt,
                unreadMessages: 0,
                role: meetingUserRelationshipTwo.role,
              },
              {
                dueDate: meeting.dueDate,
                createdAt: meeting.createdAt,
                id: meeting.id,
                createdBy: meeting.createdBy,
                teamId: meeting.teamId,
                name: meeting.name,
                type: meeting.type,
                updatedAt: meetingUserRelationship.updatedAt,
                unreadMessages: 0,
                role: meetingUserRelationship.role,
              },
            ],
          });
        } catch (error) {
          fail(error);
        }
      });
    });

    describe("when passed a 'type=meeting_due_date' query param", () => {
      it("returns a valid response", async () => {
        const params = { type: "meeting_due_date" };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.get(`${baseUrl}/users/${user.id}/conversations`, { params, headers });

          expect(status).toBe(200);
          expect(data).toEqual({
            conversations: [
              {
                dueDate: meeting.dueDate,
                createdAt: meeting.createdAt,
                id: meeting.id,
                createdBy: meeting.createdBy,
                teamId: meeting.teamId,
                name: meeting.name,
                type: meeting.type,
                updatedAt: meetingUserRelationship.updatedAt,
                unreadMessages: 0,
                role: meetingUserRelationship.role,
              },
              {
                dueDate: meetingTwo.dueDate,
                createdAt: meetingTwo.createdAt,
                id: meetingTwo.id,
                createdBy: meetingTwo.createdBy,
                name: meetingTwo.name,
                type: meetingTwo.type,
                updatedAt: meetingUserRelationshipTwo.updatedAt,
                unreadMessages: 0,
                role: meetingUserRelationshipTwo.role,
              },
            ],
          });
        } catch (error) {
          fail(error);
        }
      });
    });

    describe("when passed a 'unread=true' query param", () => {
      it("returns a valid response", async () => {
        const params = { unread: true };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.get(`${baseUrl}/users/${user.id}/conversations`, { params, headers });

          expect(status).toBe(200);
          expect(data).toEqual({
            conversations: [
              {
                createdAt: group.createdAt,
                id: group.id,
                createdBy: group.createdBy,
                name: group.name,
                type: group.type,
                updatedAt: groupUserRelationship.updatedAt,
                role: groupUserRelationship.role,
                unreadMessages: 1,
                recentMessage: {
                  createdAt: message.createdAt,
                  replyCount: message.replyCount,
                  conversationId: message.conversationId,
                  seenAt: message.seenAt,
                  reactions: message.reactions,
                  from: message.from,
                  id: message.id,
                  mimeType: message.mimeType,
                  fetchUrl: jasmine.stringMatching(URL_REGEX),
                },
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
    const userId = process.env.userId as UserId;
    const accessToken = process.env.accessToken as string;

    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const headers = {};

        try {
          await axios.get(`${baseUrl}/users/${userId}/conversations`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when a userId of a user different than the id in the accessToken is passed in", () => {
      const mockUserId: UserId = `${KeyPrefix.User}${generateRandomString(8)}`;

      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.get(`${baseUrl}/users/${mockUserId}/conversations`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(403);
          expect(error.response?.statusText).toBe("Forbidden");
        }
      });
    });

    describe("when passed invalid parameters", () => {
      it("throws a 400 error with a valid structure", async () => {
        const params = { type: "test", unread: "test" };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.get(`${baseUrl}/users/test/conversations`, { params, headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { userId: "Failed constraint check for string: Must be a user id" },
              queryStringParameters: {
                type: 'Expected "friend" | "group" | "meeting" | "meeting_due_date", but was string',
                unread: 'Expected "true" | "false", but was string',
              },
            },
          });
        }
      });
    });
  });
});
