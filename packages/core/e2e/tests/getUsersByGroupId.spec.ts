/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { OrganizationId, Role, WithRole } from "@yac/util";
import { createRandomAuthServiceUser, CreateRandomAuthServiceUserOutput, generateRandomString, getAccessTokenByEmail, URL_REGEX } from "../../../../e2e/util";
import { createRandomUser, createConversationUserRelationship, createGroup, CreateRandomUserOutput } from "../util";
import { User } from "../../src/mediator-services/user.mediator.service";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { GroupId } from "../../src/types/groupId.type";
import { Group, RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { ConversationType } from "../../src/enums/conversationType.enum";

describe("GET /groups/{groupId}/users (Get Users by Group Id)", () => {
  const baseUrl = process.env.baseUrl as string;
  let user: CreateRandomAuthServiceUserOutput;
  let accessToken: string;

  const mockGroupId: GroupId = `${KeyPrefix.Group}${generateRandomString(5)}`;
  const mockOrganizationId: OrganizationId = `${KeyPrefix.Organization}${generateRandomString()}`;

  beforeAll(async () => {
    user = await createRandomAuthServiceUser();

    ({ accessToken } = await getAccessTokenByEmail(user.email));
  });

  describe("under normal conditions", () => {
    let group: RawConversation<Group>;
    let otherUser: CreateRandomUserOutput["user"];

    beforeAll(async () => {
      ({ user: otherUser } = await createRandomUser());

      ({ conversation: group } = await createGroup({ createdBy: user.id, organizationId: mockOrganizationId, name: generateRandomString(5) }));

      await Promise.all([
        createConversationUserRelationship({ type: ConversationType.Group, userId: user.id, conversationId: group.id, role: Role.Admin }),
        createConversationUserRelationship({ type: ConversationType.Group, userId: otherUser.id, conversationId: group.id, role: Role.User }),
      ]);
    });

    describe("when not passed a 'limit' query param", () => {
      it("returns a valid response", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.get(`${baseUrl}/groups/${group.id}/users`, { headers });

          expect(status).toBe(200);
          expect(data).toEqual({
            users: [
              {
                id: user.id,
                email: user.email,
                name: user.name,
                image: jasmine.stringMatching(URL_REGEX),
                role: Role.Admin,
              },
              {
                id: otherUser.id,
                email: otherUser.email,
                username: otherUser.username,
                phone: otherUser.phone,
                name: otherUser.name,
                bio: otherUser.bio,
                image: jasmine.stringMatching(URL_REGEX),
                role: Role.User,
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
          const { status, data } = await axios.get<{ users: WithRole<User>[]; lastEvaluatedKey: string; }>(`${baseUrl}/groups/${group.id}/users`, { params, headers });

          expect(status).toBe(200);
          expect(data).toEqual({
            users: [
              {
                id: user.id,
                email: user.email,
                name: user.name,
                image: jasmine.stringMatching(URL_REGEX),
                role: Role.Admin,
              },
            ],
            lastEvaluatedKey: jasmine.any(String),
          });

          const callTwoParams = { limit: 1, exclusiveStartKey: data.lastEvaluatedKey };

          const { status: callTwoStatus, data: callTwoData } = await axios.get(
            `${baseUrl}/groups/${group.id}/users`,
            { params: callTwoParams, headers },
          );

          expect(callTwoStatus).toBe(200);
          expect(callTwoData).toEqual({
            users: [
              {
                id: otherUser.id,
                email: otherUser.email,
                username: otherUser.username,
                phone: otherUser.phone,
                name: otherUser.name,
                bio: otherUser.bio,
                image: jasmine.stringMatching(URL_REGEX),
                role: Role.User,
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
          await axios.get(`${baseUrl}/groups/${mockGroupId}/users`, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an id of a group the user is not a member of is passed in", () => {
      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.get(`${baseUrl}/groups/${mockGroupId}/users`, { headers });

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
          await axios.get(`${baseUrl}/groups/test/users`, { params, headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { groupId: "Failed constraint check for string: Must be a group id" },
              queryStringParameters: { limit: "Failed constraint check for string: Must be a whole number" },
            },
          });
        }
      });
    });
  });
});
