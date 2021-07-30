/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { Role } from "@yac/util";
import { createConversationUserRelationship, createGroupConversation } from "../util";
import { UserId } from "../../src/types/userId.type";
import { GroupConversation, RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { generateRandomString, URL_REGEX } from "../../../../e2e/util";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { GroupId } from "../../src/types/groupId.type";
import { TeamId } from "../../src/types/teamId.type";
import { ConversationType } from "../../src/enums/conversationType.enum";

describe("GET /groups/{groupId} (Get Group)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;

  describe("under normal conditions", () => {
    const mockTeamId: TeamId = `${KeyPrefix.Team}${generateRandomString(5)}`;
    let group: RawConversation<GroupConversation>;

    beforeAll(async () => {
      ({ conversation: group } = await createGroupConversation({ createdBy: userId, name: generateRandomString(5), teamId: mockTeamId }));

      await createConversationUserRelationship({ type: ConversationType.Group, conversationId: group.id, userId, role: Role.Admin });
    });

    it("returns a valid response", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.get(`${baseUrl}/groups/${group.id}`, { headers });

        expect(status).toBe(200);
        expect(data).toEqual({
          group: {
            id: group.id,
            name: group.name,
            createdBy: group.createdBy,
            createdAt: group.createdAt,
            teamId: group.teamId,
            image: jasmine.stringMatching(URL_REGEX),
          },
        });
      } catch (error) {
        fail(error);
      }
    });
  });

  describe("under error conditions", () => {
    const mockUserId: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;
    const mockGroupId: GroupId = `${KeyPrefix.GroupConversation}${generateRandomString(5)}`;

    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const headers = {};

        try {
          await axios.get(`${baseUrl}/groups/${mockGroupId}`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when a groupId of a group the user is not a member of is passed in", () => {
      let group: RawConversation<GroupConversation>;

      beforeAll(async () => {
        ({ conversation: group } = await createGroupConversation({ createdBy: mockUserId, name: generateRandomString(5) }));
      });

      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.get(`${baseUrl}/groups/${group.id}`, { headers });

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
