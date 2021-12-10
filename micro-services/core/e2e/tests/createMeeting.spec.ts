/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import axios from "axios";
import { MeetingCreatedSnsMessage, Role, Meeting } from "@yac/util";
import { backoff, generateRandomString, ISO_DATE_REGEX, URL_REGEX } from "../../../../e2e/util";
import { EntityType } from "../../src/enums/entityType.enum";
import { UserId } from "../../src/types/userId.type";
import { createOrganization, createOrganizationUserRelationship, createRandomTeam, createTeamUserRelationship, deleteSnsEventsByTopicArn, getConversation, getConversationUserRelationship, getSnsEventsByTopicArn, getUser } from "../util";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { ConversationType } from "../../src/enums/conversationType.enum";
import { RawTeam } from "../../src/repositories/team.dynamo.repository";
import { ImageMimeType } from "../../src/enums/image.mimeType.enum";
import { MeetingConversation } from "../../src/repositories/conversation.dynamo.repository";
import { RawOrganization } from "../../src/repositories/organization.dynamo.repository";

describe("POST /organizations/{organizationId}/meetings (Create Meeting)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;
  const meetingCreatedSnsTopicArn = process.env["meeting-created-sns-topic-arn"] as string;

  let team: RawTeam;
  let organization: RawOrganization;

  beforeAll(async () => {
    ({ organization } = await createOrganization({ createdBy: userId, name: generateRandomString() }));
    ({ team } = await createRandomTeam({ createdBy: userId, organizationId: organization.id }));

    await Promise.all([
      createOrganizationUserRelationship({ organizationId: organization.id, userId, role: Role.Admin }),
      createTeamUserRelationship({ teamId: team.id, userId, role: Role.Admin }),
    ]);
  });

  describe("under normal conditions", () => {
    it("returns a valid response", async () => {
      const name = generateRandomString(5);
      const dueDate = new Date().toISOString();
      const body = { name, teamId: team.id, dueDate };

      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.post(`${baseUrl}/organizations/${organization.id}/meetings`, body, { headers });

        expect(status).toBe(201);
        expect(data).toEqual({
          meeting: {
            id: jasmine.stringMatching(new RegExp(`${KeyPrefix.MeetingConversation}.*`)),
            name,
            dueDate,
            teamId: team.id,
            organizationId: organization.id,
            createdBy: userId,
            createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
            image: jasmine.stringMatching(URL_REGEX),
            type: ConversationType.Meeting,
          },
        });
      } catch (error) {
        fail(error);
      }
    });

    describe("when passed a teamId", () => {
      it("creates a valid Conversation entity", async () => {
        const name = generateRandomString(5);
        const dueDate = new Date().toISOString();
        const body = { name, teamId: team.id, dueDate };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { data } = await axios.post(`${baseUrl}/organizations/${organization.id}/meetings`, body, { headers });

          const { conversation } = await getConversation({ conversationId: data.meeting.id });

          expect(conversation).toEqual({
            entityType: EntityType.MeetingConversation,
            pk: data.meeting.id,
            sk: data.meeting.id,
            gsi1pk: team.id,
            gsi1sk: data.meeting.id,
            id: data.meeting.id,
            organizationId: organization.id,
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
    });

    describe("when not passed a teamId", () => {
      it("creates a valid Conversation entity", async () => {
        const name = generateRandomString(5);
        const dueDate = new Date().toISOString();
        const body = { name, dueDate };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { data } = await axios.post(`${baseUrl}/organizations/${organization.id}/meetings`, body, { headers });

          const { conversation } = await getConversation({ conversationId: data.meeting.id });

          expect(conversation).toEqual({
            entityType: EntityType.MeetingConversation,
            pk: data.meeting.id,
            sk: data.meeting.id,
            gsi2pk: organization.id,
            gsi2sk: data.meeting.id,
            id: data.meeting.id,
            organizationId: organization.id,
            createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
            type: ConversationType.Meeting,
            imageMimeType: ImageMimeType.Png,
            createdBy: userId,
            dueDate,
            name,
          });
        } catch (error) {
          fail(error);
        }
      });
    });

    it("creates a valid ConversationUserRelationship entity", async () => {
      const name = generateRandomString(5);
      const dueDate = new Date().toISOString();
      const body = { name, teamId: team.id, dueDate };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { data } = await axios.post(`${baseUrl}/organizations/${organization.id}/meetings`, body, { headers });

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

    it("publishes a valid SNS message", async () => {
      // clear the sns events table so the test can have a clean slate
      await deleteSnsEventsByTopicArn({ topicArn: meetingCreatedSnsTopicArn });

      const name = generateRandomString(5);
      const dueDate = new Date().toISOString();
      const body = { name, dueDate, teamId: team.id };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { data } = await axios.post<{ meeting: Meeting }>(`${baseUrl}/organizations/${organization.id}/meetings`, body, { headers });

        const [ { user }, { conversation: meeting } ] = await Promise.all([
          getUser({ userId }),
          getConversation<MeetingConversation["id"]>({ conversationId: data.meeting.id }),
        ]);

        if (!user || !meeting) {
          throw new Error("necessary records not created");
        }

        // wait the event has been fired
        const { snsEvents } = await backoff(
          () => getSnsEventsByTopicArn<MeetingCreatedSnsMessage>({ topicArn: meetingCreatedSnsTopicArn }),
          (response) => response.snsEvents.length === 1,
        );

        expect(snsEvents.length).toBe(1);

        expect(snsEvents[0]).toEqual(jasmine.objectContaining({
          message: {
            meetingMemberIds: [ userId ],
            meeting: {
              createdBy: meeting.createdBy,
              id: meeting.id,
              image: jasmine.stringMatching(URL_REGEX),
              name: meeting.name,
              dueDate: meeting.dueDate,
              teamId: meeting.teamId,
              organizationId: organization.id,
              createdAt: meeting.createdAt,
              type: meeting.type,
            },
          },
        }));
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
          await axios.post(`${baseUrl}/organizations/${organization.id}/meetings`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when passed an organizationId the user is not an admin of and no teamId", () => {
      let organizationTwo: RawOrganization;

      beforeEach(async () => {
        ({ organization: organizationTwo } = await createOrganization({ createdBy: `${KeyPrefix.User}${generateRandomString(5)}`, name: generateRandomString() }));

        await createOrganizationUserRelationship({ organizationId: organizationTwo.id, userId, role: Role.User });
      });

      it("throws a 403 error", async () => {
        const name = generateRandomString(5);
        const body = { name, dueDate: new Date().toISOString() };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.post(`${baseUrl}/organizations/${organizationTwo.id}/meetings`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(403);
          expect(error.response?.statusText).toBe("Forbidden");
        }
      });
    });

    describe("when passed a teamId the user is not an admin of", () => {
      let teamTwo: RawTeam;

      beforeEach(async () => {
        ({ team: teamTwo } = await createRandomTeam({ createdBy: `${KeyPrefix.User}${generateRandomString(5)}`, organizationId: organization.id }));

        await createTeamUserRelationship({ teamId: teamTwo.id, userId, role: Role.User });
      });

      it("throws a 403 error", async () => {
        const name = generateRandomString(5);
        const body = { name, teamId: teamTwo.id, dueDate: new Date().toISOString() };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.post(`${baseUrl}/organizations/${organization.id}/meetings`, body, { headers });

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
          await axios.post(`${baseUrl}/organizations/test/meetings`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { organizationId: "Failed constraint check for string: Must be an organization id" },
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
