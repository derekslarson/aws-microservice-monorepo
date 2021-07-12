/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { Role } from "@yac/core";
import { createConversationUserRelationship, createGroupConversation, getConversationUserRelationship } from "../util";
import { UserId } from "../../src/types/userId.type";
import { createRandomUser, generateRandomString, ISO_DATE_REGEX } from "../../../../e2e/util";
import { EntityType } from "../../src/enums/entityType.enum";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { RawConversation } from "../../src/repositories/conversation.dynamo.repository";

describe("POST /groups/{groupId}/users (Add User as Friend)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;

  const mockUserId = `${KeyPrefix.User}${generateRandomString(5)}`;
  const mockGroupId = `${KeyPrefix.GroupConversation}${generateRandomString(5)}`;

  describe("under normal conditions", () => {
    let otherUser: { id: `user-${string}`, email: string; };
    let group: RawConversation;

    beforeAll(async () => {
      ({ user: otherUser } = await createRandomUser());
    });

    beforeEach(async () => {
      ({ conversation: group } = await createGroupConversation({ createdBy: userId, name: generateRandomString(5) }));

      await createConversationUserRelationship({ conversationId: group.id, userId, role: Role.Admin });
    });

    it("returns a valid response", async () => {
      const body = { userId: otherUser.id, role: Role.User };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.post<{ message: string; }>(`${baseUrl}/groups/${group.id}/users`, body, { headers });

        expect(status).toBe(200);
        expect(data).toEqual({ message: "User added to group." });
      } catch (error) {
        fail(error);
      }
    });

    it("creates a valid ConversationUserRelationship entity", async () => {
      const body = { userId: otherUser.id, role: Role.User };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        await axios.post(`${baseUrl}/groups/${group.id}/users`, body, { headers });

        const { conversationUserRelationship } = await getConversationUserRelationship({ conversationId: group.id, userId: otherUser.id });

        expect(conversationUserRelationship).toEqual({
          entityType: EntityType.ConversationUserRelationship,
          pk: group.id,
          sk: otherUser.id,
          gsi1pk: otherUser.id,
          gsi1sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)),
          gsi2pk: otherUser.id,
          gsi2sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.GroupConversation}.*`)),
          role: Role.User,
          conversationId: group.id,
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
        const body = { userId: mockUserId, role: Role.User };
        const headers = { };

        try {
          await axios.post(`${baseUrl}/groups/${mockGroupId}/users`, body, { headers });
          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an id of a group that the user is not an admin of is passed in", () => {
      let groupTwo: RawConversation;

      beforeEach(async () => {
        ({ conversation: groupTwo } = await createGroupConversation({ createdBy: "user-123-abc", name: generateRandomString(5) }));

        await createConversationUserRelationship({ conversationId: groupTwo.id, userId, role: Role.User });
      });

      it("throws a 403 error", async () => {
        const body = { userId: mockUserId, role: Role.User };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.post(`${baseUrl}/groups/${groupTwo.id}/users`, body, { headers });

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
          await axios.post(`${baseUrl}/groups/pants/users`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { groupId: "Failed constraint check for string: Must be a group id" },
              body: {
                userId: "Expected string, but was missing",
                role: 'Expected "super_admin" | "admin" | "user", but was missing',
              },
            },
          });
        }
      });
    });
  });
});
