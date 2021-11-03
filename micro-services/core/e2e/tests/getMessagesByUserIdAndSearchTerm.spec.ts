/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Role } from "@yac/util";
import axios from "axios";
import { generateRandomString, getAccessTokenByEmail, URL_REGEX, wait } from "../../../../e2e/util";
import { ConversationType } from "../../src/enums/conversationType.enum";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { MessageMimeType } from "../../src/enums/message.mimeType.enum";
import { GroupConversation, MeetingConversation, RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { RawMessage } from "../../src/repositories/message.dynamo.repository";
import { UserId } from "../../src/types/userId.type";
import { createConversationUserRelationship, createGroupConversation, createMeetingConversation, createMessage, createRandomUser, CreateRandomUserOutput } from "../util";

describe("GET /users/{userId}/messages (Get Messages by User Id and Search Term)", () => {
  const baseUrl = process.env.baseUrl as string;

  describe("under normal conditions", () => {
    const searchParamBoth = "both";
    const searchParamOnlyMeetingMessage = "solo";

    let user: CreateRandomUserOutput["user"];
    let otherUser: CreateRandomUserOutput["user"];
    let accessToken: string;

    let meeting: RawConversation<MeetingConversation>;
    let group: RawConversation<GroupConversation>;

    let message: RawMessage;
    let messageTwo: RawMessage;

    beforeAll(async () => {
      // We have to fetch a new base user and access token here to prevent bleed over from other tests
      ([ { user }, { user: otherUser } ] = await Promise.all([ createRandomUser(), createRandomUser() ]));

      ([ { accessToken }, { conversation: meeting }, { conversation: group } ] = await Promise.all([
        getAccessTokenByEmail(user.email),
        createMeetingConversation({ createdBy: user.id, name: generateRandomString(5), dueDate: new Date("12/25/2021").toISOString() }),
        createGroupConversation({ createdBy: otherUser.id, name: generateRandomString(5) }),
      ]));

      ([ { message }, { message: messageTwo } ] = await Promise.all([
        createMessage({ from: otherUser.id, conversationId: meeting.id, conversationMemberIds: [ user.id, otherUser.id ], mimeType: MessageMimeType.AudioMp3, transcript: `${searchParamBoth} ${searchParamOnlyMeetingMessage}`, title: generateRandomString(5) }),
        createMessage({ from: otherUser.id, conversationId: group.id, conversationMemberIds: [ user.id, otherUser.id ], mimeType: MessageMimeType.AudioMp3, transcript: searchParamBoth, title: generateRandomString(5) }),
      ]));

      await Promise.all([
        createConversationUserRelationship({ type: ConversationType.Meeting, conversationId: meeting.id, userId: user.id, role: Role.Admin, dueDate: meeting.dueDate }),
        createConversationUserRelationship({ type: ConversationType.Group, conversationId: group.id, userId: user.id, role: Role.User }),
      ]);

      // wait for messages to be indexed in OpenSearch
      await wait(5000);
    });

    describe("when passed a 'searchTerm' query param", () => {
      describe("when passed a term that is in both messages", () => {
        it("returns a valid response", async () => {
          const params = { searchTerm: searchParamBoth };
          const headers = { Authorization: `Bearer ${accessToken}` };

          try {
            const { status, data } = await axios.get(`${baseUrl}/users/${user.id}/messages`, { params, headers });

            expect(status).toBe(200);
            expect(data.messages.length).toEqual(2);
            expect(data).toEqual({
              messages: jasmine.arrayContaining([
                {
                  createdAt: message.createdAt,
                  replyCount: message.replyCount,
                  title: message.title,
                  to: {
                    id: meeting.id,
                    name: meeting.name,
                    createdBy: meeting.createdBy,
                    createdAt: meeting.createdAt,
                    type: meeting.type,
                    dueDate: meeting.dueDate,
                    image: jasmine.stringMatching(URL_REGEX),
                  },
                  from: {
                    realName: otherUser.realName,
                    username: otherUser.username,
                    id: otherUser.id,
                    email: otherUser.email,
                    phone: otherUser.phone,
                    image: jasmine.stringMatching(URL_REGEX),
                  },
                  type: ConversationType.Meeting,
                  seenAt: message.seenAt,
                  reactions: message.reactions,
                  transcript: message.transcript,
                  id: message.id,
                  mimeType: message.mimeType,
                  fetchUrl: jasmine.stringMatching(URL_REGEX),
                },
                {
                  createdAt: messageTwo.createdAt,
                  replyCount: messageTwo.replyCount,
                  title: messageTwo.title,
                  to: {
                    id: group.id,
                    name: group.name,
                    createdBy: group.createdBy,
                    createdAt: group.createdAt,
                    type: group.type,
                    image: jasmine.stringMatching(URL_REGEX),
                  },
                  from: {
                    realName: otherUser.realName,
                    username: otherUser.username,
                    id: otherUser.id,
                    email: otherUser.email,
                    phone: otherUser.phone,
                    image: jasmine.stringMatching(URL_REGEX),
                  },
                  type: ConversationType.Group,
                  seenAt: messageTwo.seenAt,
                  reactions: messageTwo.reactions,
                  transcript: messageTwo.transcript,
                  id: messageTwo.id,
                  mimeType: messageTwo.mimeType,
                  fetchUrl: jasmine.stringMatching(URL_REGEX),
                },
              ]),
            });
          } catch (error) {
            fail(error);
          }
        });
      });

      describe("when passed a term that is only in one message", () => {
        it("returns a valid response", async () => {
          const params = { searchTerm: searchParamOnlyMeetingMessage };
          const headers = { Authorization: `Bearer ${accessToken}` };

          try {
            const { status, data } = await axios.get(`${baseUrl}/users/${user.id}/messages`, { params, headers });

            expect(status).toBe(200);
            expect(data.messages.length).toEqual(1);
            expect(data).toEqual({
              messages: [
                {
                  createdAt: message.createdAt,
                  replyCount: message.replyCount,
                  title: message.title,
                  to: {
                    id: meeting.id,
                    name: meeting.name,
                    createdBy: meeting.createdBy,
                    createdAt: meeting.createdAt,
                    type: meeting.type,
                    dueDate: meeting.dueDate,
                    image: jasmine.stringMatching(URL_REGEX),
                  },
                  from: {
                    realName: otherUser.realName,
                    username: otherUser.username,
                    id: otherUser.id,
                    email: otherUser.email,
                    phone: otherUser.phone,
                    image: jasmine.stringMatching(URL_REGEX),
                  },
                  type: ConversationType.Meeting,
                  seenAt: message.seenAt,
                  reactions: message.reactions,
                  transcript: message.transcript,
                  id: message.id,
                  mimeType: message.mimeType,
                  fetchUrl: jasmine.stringMatching(URL_REGEX),
                },
              ],
            });
          } catch (error) {
            fail(error);
          }
        });
      });
    });
  });

  describe("under error conditions", () => {
    const userId = process.env.userId as UserId;
    const accessToken = process.env.accessToken as string;

    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const params = { searchTerm: "test" };
        const headers = {};

        try {
          await axios.get(`${baseUrl}/users/${userId}/messages`, { params, headers });

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
        const params = { searchTerm: "test" };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.get(`${baseUrl}/users/${mockUserId}/messages`, { params, headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(403);
          expect(error.response?.statusText).toBe("Forbidden");
        }
      });
    });

    describe("when passed invalid parameters", () => {
      it("throws a 400 error with a valid structure", async () => {
        const params = { };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.get(`${baseUrl}/users/test/messages`, { params, headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { userId: "Failed constraint check for string: Must be a user id" },
              queryStringParameters: { searchTerm: "Expected string, but was missing" },
            },
          });
        }
      });
    });
  });
});
