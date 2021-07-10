/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { Role } from "@yac/core";
import { Group } from "../../src/mediator-services/group.mediator.service";
import { createConversationUserRelationship, createGroupConversation } from "../util";
import { UserId } from "../../src/types/userId.type";
import { RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { generateRandomString } from "../../../../e2e/util";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { TeamId } from "../../src/types/teamId.type";

describe("GET /groups/{groupId} (Get Group)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;

  let groupConversationA: RawConversation;
  let groupConversationB: RawConversation;

  beforeAll(async () => {
    ([ { conversation: groupConversationA }, { conversation: groupConversationB } ] = await Promise.all([
      createGroupConversation({ createdBy: userId, name: generateRandomString(5), teamId: `${KeyPrefix.Team}${generateRandomString(5)}` as TeamId }),
      createGroupConversation({ createdBy: `${KeyPrefix.User}${generateRandomString(5)}` as UserId, name: generateRandomString(5) }),
    ]));

    await createConversationUserRelationship({ conversationId: groupConversationA.id, userId, role: Role.Admin });
  });

  describe("under normal conditions", () => {
    it("returns a valid response", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.get<{ group: Group; }>(`${baseUrl}/groups/${groupConversationA.id}`, { headers });

        expect(status).toBe(200);
        expect(data).toEqual({
          group: {
            id: groupConversationA.id,
            name: groupConversationA.name,
            createdBy: groupConversationA.createdBy,
            createdAt: groupConversationA.createdAt,
            teamId: groupConversationA.teamId,
          },
        });
      } catch (error) {
        fail(error);
      }
    });
  });

  describe("under error conditions", () => {
    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const headers = {};

        try {
          await axios.get(`${baseUrl}/groups/${groupConversationA.id}`, { headers });

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
          await axios.get(`${baseUrl}/groups/${groupConversationB.id}`, { headers });

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
          await axios.get(`${baseUrl}/groups/test`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: { pathParameters: { groupId: "Failed constraint check for string: Must be a group id" } },
          });
        }
      });
    });
  });
});
