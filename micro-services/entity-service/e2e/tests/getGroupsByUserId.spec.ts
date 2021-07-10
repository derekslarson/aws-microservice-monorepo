/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { Role, WithRole } from "@yac/core";
import { Group } from "../../src/mediator-services/group.mediator.service";
import { createConversationUserRelationship, createGroupConversation } from "../util";
import { UserId } from "../../src/types/userId.type";
import { RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { createRandomUser, generateRandomString, getAccessTokenByEmail } from "../../../../e2e/util";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { TeamId } from "../../src/types/teamId.type";
import { ConversationType } from "../../src/enums/conversationType.enum";

describe("GET /users/{userId}/groups (Get Groups by User Id)", () => {
  const baseUrl = process.env.baseUrl as string;

  let userId: UserId;
  let accessToken: string;
  let groupConversationA: RawConversation;
  let groupConversationB: RawConversation;
  const otherUserId = `${KeyPrefix.User}${generateRandomString(5)}` as UserId;

  beforeAll(async () => {
    // We have to fetch a new base user and access token here to prevent bleed over from other tests
    const { user } = await createRandomUser();
    userId = user.id;

    ([ { accessToken }, { conversation: groupConversationA }, { conversation: groupConversationB } ] = await Promise.all([
      getAccessTokenByEmail(user.email),
      createGroupConversation({ createdBy: userId, name: generateRandomString(5), teamId: `${KeyPrefix.Team}${generateRandomString(5)}` as TeamId }),
      createGroupConversation({ createdBy: otherUserId, name: generateRandomString(5) }),
    ]));

    // We need to wait create the relationships in sequence, so that we can be sure of the return order in the test
    await createConversationUserRelationship({ conversationId: groupConversationA.id, userId, role: Role.Admin });
    await createConversationUserRelationship({ conversationId: groupConversationB.id, userId, role: Role.User });
  });

  describe("under normal conditions", () => {
    describe("when not passed a 'limit' query param", () => {
      it("returns a valid response", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.get<{ groups: WithRole<Group>[]; }>(`${baseUrl}/users/${userId}/groups`, { headers });

          expect(status).toBe(200);
          expect(data).toEqual({
            groups: [
              {
                id: groupConversationB.id,
                name: groupConversationB.name,
                createdBy: groupConversationB.createdBy,
                createdAt: groupConversationB.createdAt,
                type: ConversationType.Group,
                role: Role.User,
              },
              {
                id: groupConversationA.id,
                name: groupConversationA.name,
                createdBy: groupConversationA.createdBy,
                createdAt: groupConversationA.createdAt,
                teamId: groupConversationA.teamId,
                type: ConversationType.Group,
                role: Role.Admin,
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
          const { status, data } = await axios.get<{ groups: WithRole<Group>[]; lastEvaluatedKey: string; }>(`${baseUrl}/users/${userId}/groups`, { params, headers });

          expect(status).toBe(200);
          expect(data).toEqual({
            groups: [
              {
                id: groupConversationB.id,
                name: groupConversationB.name,
                createdBy: groupConversationB.createdBy,
                createdAt: groupConversationB.createdAt,
                type: ConversationType.Group,
                role: Role.User,
              },
            ],
            lastEvaluatedKey: jasmine.any(String),
          });

          const callTwoParams = { limit: 1, exclusiveStartKey: data.lastEvaluatedKey };

          const { status: callTwoStatus, data: callTwoData } = await axios.get<{ groups: WithRole<Group>[]; }>(
            `${baseUrl}/users/${userId}/groups`,
            { params: callTwoParams, headers },
          );

          expect(callTwoStatus).toBe(200);
          expect(callTwoData).toEqual({
            groups: [
              {
                id: groupConversationA.id,
                name: groupConversationA.name,
                createdBy: groupConversationA.createdBy,
                createdAt: groupConversationA.createdAt,
                teamId: groupConversationA.teamId,
                type: ConversationType.Group,
                role: Role.Admin,
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
    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const headers = {};

        try {
          await axios.get(`${baseUrl}/users/${userId}/groups`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when a groupId of a group the user is not a member of is passed in", () => {
      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.get(`${baseUrl}/users/${otherUserId}/groups`, { headers });

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
          await axios.get(`${baseUrl}/users/test/groups`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: { pathParameters: { userId: "Failed constraint check for string: Must be a user id" } },
          });
        }
      });
    });
  });
});
