/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { GroupCreatedSnsMessage, Role } from "@yac/util";
import { backoff, generateRandomString, ISO_DATE_REGEX, URL_REGEX } from "../../../../e2e/util";
import { Group } from "../../src/mediator-services/group.mediator.service";
import { EntityType } from "../../src/enums/entityType.enum";
import { UserId } from "../../src/types/userId.type";
import { createOrganization, createOrganizationUserRelationship, createRandomTeam, createTeamUserRelationship, deleteSnsEventsByTopicArn, getConversation, getConversationUserRelationship, getSnsEventsByTopicArn, getUser } from "../util";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { ConversationType } from "../../src/enums/conversationType.enum";
import { RawTeam } from "../../src/repositories/team.dynamo.repository";
import { ImageMimeType } from "../../src/enums/image.mimeType.enum";
import { GroupId } from "../../src/types/groupId.type";
import { RawOrganization } from "../../src/repositories/organization.dynamo.repository";

describe("POST /organizations/{organizationId}/groups (Create Group)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;
  const groupCreatedSnsTopicArn = process.env["group-created-sns-topic-arn"] as string;

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
      const body = { name, teamId: team.id };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.post(`${baseUrl}/organizations/${organization.id}/groups`, body, { headers });

        expect(status).toBe(201);
        expect(data).toEqual({
          group: {
            id: jasmine.stringMatching(new RegExp(`${KeyPrefix.GroupConversation}.*`)),
            organizationId: organization.id,
            name,
            teamId: team.id,
            createdBy: userId,
            createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
            image: jasmine.stringMatching(URL_REGEX),
            type: ConversationType.Group,
          },
        });
      } catch (error) {
        fail(error);
      }
    });

    describe("when passed a teamId", () => {
      it("creates a valid Conversation entity", async () => {
        const name = generateRandomString(5);
        const body = { name, teamId: team.id };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { data } = await axios.post<{ group: Group; }>(`${baseUrl}/organizations/${organization.id}/groups`, body, { headers });

          const { conversation } = await getConversation({ conversationId: data.group.id });

          expect(conversation).toEqual({
            entityType: EntityType.GroupConversation,
            pk: data.group.id,
            sk: data.group.id,
            gsi1pk: team.id,
            gsi1sk: data.group.id,
            id: data.group.id,
            organizationId: organization.id,
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
    });

    describe("when not passed a teamId", () => {
      it("creates a valid Conversation entity", async () => {
        const name = generateRandomString(5);
        const body = { name };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { data } = await axios.post<{ group: Group; }>(`${baseUrl}/organizations/${organization.id}/groups`, body, { headers });

          const { conversation } = await getConversation({ conversationId: data.group.id });

          expect(conversation).toEqual({
            entityType: EntityType.GroupConversation,
            pk: data.group.id,
            sk: data.group.id,
            gsi2pk: organization.id,
            gsi2sk: data.group.id,
            id: data.group.id,
            organizationId: organization.id,
            createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
            imageMimeType: ImageMimeType.Png,
            type: ConversationType.Group,
            createdBy: userId,
            name,
          });
        } catch (error) {
          fail(error);
        }
      });
    });

    it("creates a valid ConversationUserRelationship entity", async () => {
      const name = generateRandomString(5);
      const body = { name };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { data } = await axios.post<{ group: Group; }>(`${baseUrl}/organizations/${organization.id}/groups`, body, { headers });

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

    it("publishes a valid SNS message", async () => {
      // clear the sns events table so the test can have a clean slate
      await deleteSnsEventsByTopicArn({ topicArn: groupCreatedSnsTopicArn });

      const name = generateRandomString(5);
      const body = { name, teamId: team.id };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { data } = await axios.post(`${baseUrl}/organizations/${organization.id}/groups `, body, { headers });

        const [ { user }, { conversation: group } ] = await Promise.all([
          getUser({ userId }),
          getConversation<GroupId>({ conversationId: (data.group as Group).id }),
        ]);

        if (!user || !group) {
          throw new Error("necessary records not created");
        }

        // wait the event has been fired
        const { snsEvents } = await backoff(
          () => getSnsEventsByTopicArn<GroupCreatedSnsMessage>({ topicArn: groupCreatedSnsTopicArn }),
          (response) => response.snsEvents.length === 1,
        );

        expect(snsEvents.length).toBe(1);

        expect(snsEvents[0]).toEqual(jasmine.objectContaining({
          message: {
            groupMemberIds: [ userId ],
            group: {
              createdBy: group.createdBy,
              teamId: group.teamId,
              organizationId: organization.id,
              image: jasmine.stringMatching(URL_REGEX),
              name: group.name,
              createdAt: group.createdAt,
              type: group.type,
              id: group.id,
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
          await axios.post(`${baseUrl}/organizations/${organization.id}/groups`, body, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
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
        const name = generateRandomString();
        const body = { name, teamId: teamTwo.id };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.post(`${baseUrl}/organizations/${organization.id}/groups`, body, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(403);
          expect(error.response?.statusText).toBe("Forbidden");
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
        const body = { name };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.post(`${baseUrl}/organizations/${organizationTwo.id}/groups`, body, { headers });

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
          await axios.post(`${baseUrl}/organizations/test/groups`, body, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { organizationId: "Failed constraint check for string: Must be an organization id" },
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
