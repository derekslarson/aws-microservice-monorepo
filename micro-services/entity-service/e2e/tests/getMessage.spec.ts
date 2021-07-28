/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Role } from "@yac/core";
import axios from "axios";
import { generateRandomString, URL_REGEX } from "../../../../e2e/util";
import { ConversationType } from "../../src/enums/conversationType.enum";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { MessageMimeType } from "../../src/enums/message.mimeType.enum";
import { RawMessage } from "../../src/repositories/message.dynamo.repository";
import { GroupId } from "../../src/types/groupId.type";
import { UserId } from "../../src/types/userId.type";
import { createConversationUserRelationship, createMessage, createRandomUser, CreateRandomUserOutput } from "../util";

describe("GET /messages/{messageId} (Get Message)", () => {
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

    beforeAll(async () => {
      ([ { message } ] = await Promise.all([
        createMessage({ from: otherUser.id, conversationId: mockConversationId, conversationMemberIds: [ userId ], replyCount: 0, mimeType: MessageMimeType.AudioMp3 }),
        createConversationUserRelationship({ type: ConversationType.Group, conversationId: mockConversationId, userId, role: Role.User }),
      ]));
    });

    it("returns a valid response", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.get(`${baseUrl}/messages/${message.id}`, { headers });

        expect(status).toBe(200);
        expect(data).toEqual({
          message: {
            id: message.id,
            from: message.from,
            conversationId: message.conversationId,
            createdAt: message.createdAt,
            seenAt: message.seenAt,
            reactions: message.reactions,
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
  });

  describe("under error conditions", () => {
    const mockMessageId = `${KeyPrefix.Message}${generateRandomString(5)}`;

    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const headers = {};

        try {
          await axios.get(`${baseUrl}/messages/${mockMessageId}`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an id of a message in a conversation that the user is not a member of is passed in", () => {
      const mockConversationId: GroupId = `${KeyPrefix.GroupConversation}${generateRandomString(5)}`;
      let message: RawMessage;

      beforeAll(async () => {
        ([ { message } ] = await Promise.all([
          createMessage({ from: otherUser.id, conversationId: mockConversationId, conversationMemberIds: [ userId ], replyCount: 0, mimeType: MessageMimeType.AudioMp3 }),
        ]));
      });

      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.get(`${baseUrl}/messages/${message.id}`, { headers });

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

        try {
          await axios.get(`${baseUrl}/messages/test`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: { pathParameters: { messageId: "Failed constraint check for string: Must be a message id" } },
          });
        }
      });
    });
  });
});
