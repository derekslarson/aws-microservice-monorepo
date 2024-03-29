/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { Role } from "@yac/util";
import { createRandomAuthServiceUser, generateRandomString, getAccessTokenByEmail, URL_REGEX } from "../../../../e2e/util";
import { User } from "../../src/mediator-services/user.mediator.service";
import { createConversationUserRelationship, createFriendConversation, createRandomUser, CreateRandomUserOutput } from "../util";
import { UserId } from "../../src/types/userId.type";
import { FriendConversation, RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { ConversationType } from "../../src/enums/conversationType.enum";

describe("GET /users/{userId}/friends (Get Friends by User Id)", () => {
  const baseUrl = process.env.baseUrl as string;

  const mockUserId = `${KeyPrefix.User}${generateRandomString(5)}`;

  describe("under normal conditions", () => {
    let userId: UserId;
    let accessToken: string;
    let otherUserA: CreateRandomUserOutput["user"];
    let otherUserB: CreateRandomUserOutput["user"];
    let conversationA: RawConversation<FriendConversation>;
    let conversationB: RawConversation<FriendConversation>;

    beforeAll(async () => {
      // We have to fetch a new base user and access token here to prevent bleed over from other tests
      const user = await createRandomAuthServiceUser();
      userId = user.id;

      ([ { accessToken }, { user: otherUserA }, { user: otherUserB } ] = await Promise.all([
        getAccessTokenByEmail(user.email),
        createRandomUser(),
        createRandomUser(),
      ]));

      ([ { conversation: conversationA }, { conversation: conversationB } ] = await Promise.all([
        createFriendConversation({ userId, friendId: otherUserA.id }),
        createFriendConversation({ userId, friendId: otherUserB.id }),
      ]));

      // break the convo relationship creation up to ensure different updatedAt timestamps, so that we can predict return order
      await Promise.all([
        createConversationUserRelationship({ type: ConversationType.Friend, userId, conversationId: conversationA.id, role: Role.Admin }),
        createConversationUserRelationship({ type: ConversationType.Friend, userId: otherUserA.id, conversationId: conversationA.id, role: Role.Admin }),
      ]);

      await Promise.all([
        createConversationUserRelationship({ type: ConversationType.Friend, userId, conversationId: conversationB.id, role: Role.Admin }),
        createConversationUserRelationship({ type: ConversationType.Friend, userId: otherUserB.id, conversationId: conversationB.id, role: Role.Admin }),
      ]);
    });

    describe("when not passed a 'limit' query param", () => {
      it("returns a valid response", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.get(`${baseUrl}/users/${userId}/friends`, { headers });

          expect(status).toBe(200);
          expect(data).toEqual({
            friends: [
              {
                name: otherUserB.name,
                bio: otherUserB.bio,
                username: otherUserB.username,
                id: otherUserB.id,
                email: otherUserB.email,
                phone: otherUserB.phone,
                image: jasmine.stringMatching(URL_REGEX),
              },
              {
                name: otherUserA.name,
                bio: otherUserA.bio,
                username: otherUserA.username,
                id: otherUserA.id,
                email: otherUserA.email,
                phone: otherUserA.phone,
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
        const params = { limit: 1 };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.get<{ friends: User[]; lastEvaluatedKey: string; }>(`${baseUrl}/users/${userId}/friends`, { params, headers });

          expect(status).toBe(200);
          expect(data).toEqual({
            friends: [
              {
                name: otherUserB.name,
                bio: otherUserB.bio,
                username: otherUserB.username,
                id: otherUserB.id,
                email: otherUserB.email,
                phone: otherUserB.phone,
                image: jasmine.stringMatching(URL_REGEX),
              },
            ],
            lastEvaluatedKey: jasmine.any(String),
          });

          const callTwoParams = { limit: 1, exclusiveStartKey: data.lastEvaluatedKey };

          const { status: callTwoStatus, data: callTwoData } = await axios.get(
            `${baseUrl}/users/${userId}/friends`,
            { params: callTwoParams, headers },
          );

          expect(callTwoStatus).toBe(200);
          expect(callTwoData).toEqual({
            friends: [
              {
                name: otherUserA.name,
                bio: otherUserA.bio,
                username: otherUserA.username,
                id: otherUserA.id,
                email: otherUserA.email,
                phone: otherUserA.phone,
                image: jasmine.stringMatching(URL_REGEX),
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
          await axios.get(`${baseUrl}/users/${userId}/friends`, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when a userId of a user different than the id in the accessToken is passed in", () => {
      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.get(`${baseUrl}/users/${mockUserId}/friends`, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(403);
          expect(error.response?.statusText).toBe("Forbidden");
        }
      });
    });

    describe("when passed invalid parameters", () => {
      it("throws a 400 error with a valid structure", async () => {
        const params = { limit: "pants" };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.get(`${baseUrl}/users/test/friends`, { params, headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { userId: "Failed constraint check for string: Must be a user id" },
              queryStringParameters: { limit: "Failed constraint check for string: Must be a whole number" },
            },
          });
        }
      });
    });
  });
});
