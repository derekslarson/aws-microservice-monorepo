/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { Role, TeamCreatedSnsMessage } from "@yac/util";
import { backoff, generateRandomString, URL_REGEX } from "../../../../e2e/util";
import { Team } from "../../src/mediator-services/team.mediator.service";
import { EntityType } from "../../src/enums/entityType.enum";
import { UserId } from "../../src/types/userId.type";
import { createOrganization, createOrganizationUserRelationship, deleteSnsEventsByTopicArn, getSnsEventsByTopicArn, getTeam, getTeamUserRelationship, getUser } from "../util";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { ImageMimeType } from "../../src/enums/image.mimeType.enum";
import { RawOrganization } from "../../src/repositories/organization.dynamo.repository";

describe("POST /organizations/{organizationId}/teams (Create Team)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;
  const teamCreatedSnsTopicArn = process.env["team-created-sns-topic-arn"] as string;
  let organization: RawOrganization;

  beforeAll(async () => {
    ({ organization } = await createOrganization({ createdBy: userId, name: generateRandomString() }));

    await createOrganizationUserRelationship({ organizationId: organization.id, userId, role: Role.Admin });
  });

  describe("under normal conditions", () => {
    it("returns a valid response", async () => {
      const name = generateRandomString(5);
      const body = { name };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.post(`${baseUrl}/organizations/${organization.id}/teams`, body, { headers });

        expect(status).toBe(201);
        expect(data).toEqual({
          team: {
            id: jasmine.stringMatching(new RegExp(`${KeyPrefix.Team}.*`)),
            name,
            createdBy: userId,
            role: Role.Admin,
            organizationId: organization.id,
            image: jasmine.stringMatching(URL_REGEX),
          },
        });
      } catch (error) {
        fail(error);
      }
    });

    it("creates a valid Team entity", async () => {
      const name = generateRandomString(5);
      const body = { name };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { data } = await axios.post<{ team: Team; }>(`${baseUrl}/organizations/${organization.id}/teams`, body, { headers });

        const { team } = await getTeam({ teamId: data.team.id });

        expect(team).toEqual({
          entityType: EntityType.Team,
          pk: data.team.id,
          sk: EntityType.Team,
          gsi1pk: organization.id,
          gsi1sk: data.team.id,
          id: data.team.id,
          createdBy: userId,
          name,
          imageMimeType: ImageMimeType.Png,
          organizationId: organization.id,
        });
      } catch (error) {
        fail(error);
      }
    });

    it("creates a valid TeamUserRelationship entity", async () => {
      const name = generateRandomString(5);
      const body = { name };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { data } = await axios.post<{ team: Team; }>(`${baseUrl}/organizations/${organization.id}/teams`, body, { headers });

        const { teamUserRelationship } = await getTeamUserRelationship({ teamId: data.team.id, userId });

        expect(teamUserRelationship).toEqual({
          entityType: EntityType.TeamUserRelationship,
          pk: data.team.id,
          sk: userId,
          gsi1pk: userId,
          gsi1sk: data.team.id,
          teamId: data.team.id,
          role: Role.Admin,
          userId,
        });
      } catch (error) {
        fail(error);
      }
    });

    it("publishes a valid SNS message", async () => {
      // clear the sns events table so the test can have a clean slate
      await deleteSnsEventsByTopicArn({ topicArn: teamCreatedSnsTopicArn });

      const name = generateRandomString(5);
      const body = { name };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { data } = await axios.post(`${baseUrl}/organizations/${organization.id}/teams`, body, { headers });

        const [ { user }, { team } ] = await Promise.all([
          getUser({ userId }),
          getTeam({ teamId: data.team.id }),
        ]);

        if (!user || !team) {
          throw new Error("necessary records not created");
        }

        // wait the event has been fired
        const { snsEvents } = await backoff(
          () => getSnsEventsByTopicArn<TeamCreatedSnsMessage>({ topicArn: teamCreatedSnsTopicArn }),
          (response) => response.snsEvents.length === 1,
        );

        expect(snsEvents.length).toBe(1);

        expect(snsEvents[0]).toEqual(jasmine.objectContaining({
          message: {
            teamMemberIds: [ userId ],
            team: {
              createdBy: team.createdBy,
              id: team.id,
              image: jasmine.stringMatching(URL_REGEX),
              name: team.name,
              organizationId: organization.id,
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
          await axios.post(`${baseUrl}/organizations/${organization.id}/teams`, body, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when passed an organizationId the user is not an admin of", () => {
      let organizationTwo: RawOrganization;

      beforeEach(async () => {
        ({ organization: organizationTwo } = await createOrganization({ createdBy: userId, name: generateRandomString() }));
      });

      it("throws a 403 error", async () => {
        const name = generateRandomString(5);
        const body = { name };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.post(`${baseUrl}/organizations/${organizationTwo.id}/teams`, body, { headers });

          fail("Expected an error");
        } catch (error: any) {
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
          await axios.post(`${baseUrl}/organizations/test/teams`, body, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { organizationId: "Failed constraint check for string: Must be an organization id" },
              body: { name: "Expected string, but was missing" },
            },
          });
        }
      });
    });
  });
});
