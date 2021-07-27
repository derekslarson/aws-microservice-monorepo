/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import axios from "axios";
import { Role } from "@yac/core";
import { generateRandomString, ISO_DATE_REGEX, URL_REGEX } from "../../../../e2e/util";
import { Meeting } from "../../src/mediator-services/meeting.mediator.service";
import { EntityType } from "../../src/enums/entityType.enum";
import { UserId } from "../../src/types/userId.type";
import { createRandomTeam, createTeamUserRelationship, getConversation, getConversationUserRelationship } from "../util";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { ConversationType } from "../../src/enums/conversationType.enum";
import { RawTeam } from "../../src/repositories/team.dynamo.repository";
import { ImageMimeType } from "../../src/enums/image.mimeType.enum";

describe("POST /users/{userId}/meetings (Create Meeting)", () => {
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
      const dueDate = new Date().toISOString();
      const body = { name, teamId: team.id, dueDate };

      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.post<{ meeting: Meeting; }>(`${baseUrl}/users/${userId}/meetings`, body, { headers });

        expect(status).toBe(201);
        expect(data).toEqual({
          meeting: {
            id: jasmine.stringMatching(new RegExp(`${KeyPrefix.MeetingConversation}.*`)),
            name,
            dueDate,
            teamId: team.id,
            createdBy: userId,
            createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
            imageMimeType: ImageMimeType.Png,
            image: jasmine.stringMatching(URL_REGEX),
          },
        });
      } catch (error) {
        fail(error);
      }
    });

    it("creates a valid Conversation entity", async () => {
      const name = generateRandomString(5);
      const dueDate = new Date().toISOString();
      const body = { name, teamId: team.id, dueDate };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { data } = await axios.post(`${baseUrl}/users/${userId}/meetings`, body, { headers });

        const { conversation } = await getConversation({ conversationId: data.meeting.id });

        expect(conversation).toEqual({
          entityType: EntityType.MeetingConversation,
          pk: data.meeting.id,
          sk: data.meeting.id,
          gsi1pk: team.id,
          gsi1sk: data.meeting.id,
          id: data.meeting.id,
          createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
          type: ConversationType.Meeting,
          imageMimeType: ImageMimeType.Png,
          teamId: team.id,
          createdBy: userId,
          dueDate,
          name,
        });
      } catch (error) {
        fail(error);
      }
    });

    it("creates a valid ConversationUserRelationship entity", async () => {
      const name = generateRandomString(5);
      const dueDate = new Date().toISOString();
      const body = { name, teamId: team.id, dueDate };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { data } = await axios.post(`${baseUrl}/users/${userId}/meetings`, body, { headers });

        const { conversationUserRelationship } = await getConversationUserRelationship({ conversationId: data.meeting.id, userId });

        expect(conversationUserRelationship).toEqual({
          entityType: EntityType.ConversationUserRelationship,
          pk: data.meeting.id,
          sk: userId,
          gsi1pk: userId,
          gsi1sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)),
          gsi2pk: userId,
          gsi2sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.MeetingConversation}.*`)),
          gsi3pk: userId,
          gsi3sk: `${KeyPrefix.Time}${data.meeting.dueDate as string}`,
          role: Role.Admin,
          type: ConversationType.Meeting,
          conversationId: data.meeting.id,
          dueDate: data.meeting.dueDate,
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
          await axios.post(`${baseUrl}/users/${userId}/meetings`, body, { headers });

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
        const body = { name, teamId: teamTwo.id, dueDate: new Date().toISOString() };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.post(`${baseUrl}/users/${userId}/meetings`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(403);
          expect(error.response?.statusText).toBe("Forbidden");
        }
      });
    });

    describe("when passed invalid parameters", () => {
      it("throws a 400 error with a valid structure", async () => {
        const body = { teamId: 1, dueDate: "test" };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.post(`${baseUrl}/users/test/meetings`, body, { headers });

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
                dueDate: "Failed constraint check for string: Must be an ISO timestamp",
              },
            },
          });
        }
      });
    });
  });
});
