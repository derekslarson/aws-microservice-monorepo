/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { Role } from "@yac/core";
import { createRandomUser, getConversation, getConversationUserRelationship } from "../util";
import { UserId } from "../../src/types/userId.type";
import { generateRandomString, ISO_DATE_REGEX } from "../../../../e2e/util";
import { EntityType } from "../../src/enums/entityType.enum";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { ConversationType } from "../../src/enums/conversationType.enum";
import { ConversationId } from "../../src/types/conversationId.type";

describe("POST /users/{userId}/friends (Add User as Friend)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;

  const mockUserId = `${KeyPrefix.User}${generateRandomString(5)}`;
  let otherUser: { id: `${KeyPrefix.User}${string}`, email: string; };
  let conversationId: ConversationId;

  describe("under normal conditions", () => {
    beforeEach(async () => {
      ({ user: otherUser } = await createRandomUser());

      conversationId = `${KeyPrefix.FriendConversation}${[ userId, otherUser.id ].sort().join("-")}`;
    });

    it("returns a valid response", async () => {
      const body = { friendId: otherUser.id };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.post<{ message: string; }>(`${baseUrl}/users/${userId}/friends`, body, { headers });

        expect(status).toBe(200);
        expect(data).toEqual({ message: "User added as friend." });
      } catch (error) {
        fail(error);
      }
    });

    it("creates a valid Conversation entity", async () => {
      const body = { friendId: otherUser.id };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        await axios.post(`${baseUrl}/users/${userId}/friends`, body, { headers });

        const { conversation } = await getConversation({ conversationId });

        expect(conversation).toBeDefined();

        expect(conversation).toEqual({
          entityType: EntityType.FriendConversation,
          pk: conversationId,
          sk: conversationId,
          id: conversationId,
          type: ConversationType.Friend,
          createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
        });
      } catch (error) {
        fail(error);
      }
    });

    it("creates valid ConversationUserRelationship entities", async () => {
      const body = { friendId: otherUser.id };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        await axios.post(`${baseUrl}/users/${userId}/friends`, body, { headers });

        const [
          { conversationUserRelationship: conversationUserRelationshipA },
          { conversationUserRelationship: conversationUserRelationshipB },
        ] = await Promise.all([
          getConversationUserRelationship({ conversationId, userId }),
          getConversationUserRelationship({ conversationId, userId: otherUser.id }),
        ]);

        expect(conversationUserRelationshipA).toEqual({
          entityType: EntityType.ConversationUserRelationship,
          pk: conversationId,
          sk: userId,
          gsi1pk: userId,
          gsi1sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)),
          gsi2pk: userId,
          gsi2sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.FriendConversation}.*`)),
          role: Role.Admin,
          conversationId,
          userId,
          updatedAt: jasmine.stringMatching(ISO_DATE_REGEX),
          muted: false,
        });

        expect(conversationUserRelationshipB).toEqual({
          entityType: EntityType.ConversationUserRelationship,
          pk: conversationId,
          sk: otherUser.id,
          gsi1pk: otherUser.id,
          gsi1sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)),
          gsi2pk: otherUser.id,
          gsi2sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.FriendConversation}.*`)),
          role: Role.Admin,
          conversationId,
          userId: otherUser.id,
          updatedAt: jasmine.stringMatching(ISO_DATE_REGEX),
          muted: false,
        });
      } catch (error) {
        fail(error);
      }
    });
  });

  describe("under error conditions", () => {
    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const body = { friendId: mockUserId };
        const headers = {};

        try {
          await axios.post(`${baseUrl}/users/${userId}/friends`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an id of a user different than the one in the access token is passed in", () => {
      const mockUserIdTwo = `${KeyPrefix.User}${generateRandomString(5)}`;

      it("throws a 403 error", async () => {
        const body = { friendId: mockUserId };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.post(`${baseUrl}/users/${mockUserIdTwo}/friends`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(403);
          expect(error.response?.statusText).toBe("Forbidden");
        }
      });
    });

    describe("when passed invalid parameters", () => {
      it("throws a 400 error with a valid structure", async () => {
        const body = {};
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.post(`${baseUrl}/users/pants/friends`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { userId: "Failed constraint check for string: Must be a user id" },
              body: { friendId: "Expected string, but was missing" },
            },
          });
        }
      });
    });
  });
});
