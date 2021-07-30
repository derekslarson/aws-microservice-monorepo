/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { Role } from "@yac/util";
import { generateRandomString, ISO_DATE_REGEX, URL_REGEX } from "../../../../e2e/util";
import { Group } from "../../src/mediator-services/group.mediator.service";
import { EntityType } from "../../src/enums/entityType.enum";
import { UserId } from "../../src/types/userId.type";
import { createRandomTeam, createTeamUserRelationship, getConversation, getConversationUserRelationship } from "../util";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { ConversationType } from "../../src/enums/conversationType.enum";
import { RawTeam } from "../../src/repositories/team.dynamo.repository";
import { ImageMimeType } from "../../src/enums/image.mimeType.enum";

describe("POST /users/{userId}/groups (Create Group)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;

  describe("under normal conditions", () => {
    let team: RawTeam;

    beforeEach(async () => {
      ({ team } = await createRandomTeam({ createdBy: userId }));

      await createTeamUserRelationship({ teamId: team.id, userId, role: Role.Admin });
    });

    it("returns a valid response", async () => {
      const name = generateRandomString(5);
      const body = { name, teamId: team.id };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.post(`${baseUrl}/users/${userId}/groups`, body, { headers });

        expect(status).toBe(201);
        expect(data).toEqual({
          group: {
            id: jasmine.stringMatching(new RegExp(`${KeyPrefix.GroupConversation}.*`)),
            name,
            teamId: team.id,
            createdBy: userId,
            createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
            image: jasmine.stringMatching(URL_REGEX),
          },
        });
      } catch (error) {
        fail(error);
      }
    });

    it("creates a valid Conversation entity", async () => {
      const name = generateRandomString(5);
      const body = { name, teamId: team.id };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { data } = await axios.post<{ group: Group; }>(`${baseUrl}/users/${userId}/groups`, body, { headers });

        const { conversation } = await getConversation({ conversationId: data.group.id });

        expect(conversation).toEqual({
          entityType: EntityType.GroupConversation,
          pk: data.group.id,
          sk: data.group.id,
          gsi1pk: team.id,
          gsi1sk: data.group.id,
          id: data.group.id,
          createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
          imageMimeType: ImageMimeType.Png,
          type: ConversationType.Group,
          createdBy: userId,
          teamId: team.id,
          name,
        });
      } catch (error) {
        fail(error);
      }
    });

    it("creates a valid ConversationUserRelationship entity", async () => {
      const name = generateRandomString(5);
      const body = { name };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { data } = await axios.post<{ group: Group; }>(`${baseUrl}/users/${userId}/groups`, body, { headers });

        const { conversationUserRelationship } = await getConversationUserRelationship({ conversationId: data.group.id, userId });

        expect(conversationUserRelationship).toEqual({
          entityType: EntityType.ConversationUserRelationship,
          pk: data.group.id,
          sk: userId,
          gsi1pk: userId,
          gsi1sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)),
          gsi2pk: userId,
          gsi2sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.GroupConversation}.*`)),
          role: Role.Admin,
          conversationId: data.group.id,
          type: ConversationType.Group,
          userId,
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
        const name = generateRandomString(5);
        const body = { name };
        const headers = {};

        try {
          await axios.post(`${baseUrl}/users/${userId}/groups`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when passed a teamId the user is not an admin of", () => {
      let teamTwo: RawTeam;

      beforeEach(async () => {
        ({ team: teamTwo } = await createRandomTeam({ createdBy: `${KeyPrefix.User}${generateRandomString(5)}` }));

        await createTeamUserRelationship({ teamId: teamTwo.id, userId, role: Role.User });
      });

      it("throws a 403 error", async () => {
        const name = generateRandomString(5);
        const body = { name, teamId: teamTwo.id };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.post(`${baseUrl}/users/${userId}/groups`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(403);
          expect(error.response?.statusText).toBe("Forbidden");
        }
      });
    });

    describe("when passed invalid parameters", () => {
      it("throws a 400 error with a valid structure", async () => {
        const body = { teamId: 1 };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.post(`${baseUrl}/users/test/groups`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { userId: "Failed constraint check for string: Must be a user id" },
              body: {
                name: "Expected string, but was missing",
                teamId: "Expected string, but was number",
              },
            },
          });
        }
      });
    });
  });
});
