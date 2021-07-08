/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import jasmine from "jasmine";
import axios, { AxiosError } from "axios";
import { Role } from "@yac/core";
import { createRandomUser, getAccessTokenByEmail, generateRandomString, documentClient } from "../../../config/jasmine/e2e.util";
import { Team } from "../src/mediator-services/team.mediator.service";
import { EntityType } from "../src/enums/entityType.enum";
import { User } from "../src/mediator-services/user.mediator.service";

describe("POST /users/{user.id}/teams", () => {
  const environment = process.env.environment as string;
  const baseUrl = `https://${environment}.yacchat.com/entity-service`;

  let user: User;
  let accessToken: string;

  beforeAll(async () => {
    (jasmine as any).DEFAULT_TIMEOUT_INTERVAL = 15000;

    user = await createRandomUser() as User;

    ({ accessToken } = await getAccessTokenByEmail(user.email));
  });

  describe("under normal conditions", () => {
    it("returns a valid response", async () => {
      const name = generateRandomString(5);
      const body = { name };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.post<{ team: Team; }>(`${baseUrl}/users/${user.id}/teams`, body, { headers });

        expect(status).toBe(201);
        expect(data.team).toBeDefined();
        expect(data.team.id).toMatch(/team-.*/);
        expect(data.team.name).toBe(name);
        expect(data.team.createdBy).toBe(user.id);
      } catch (error) {
        fail(error);
      }
    });

    it("creates a valid Team entity", async () => {
      const name = generateRandomString(5);
      const body = { name };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { data } = await axios.post<{ team: Team; }>(`${baseUrl}/users/${user.id}/teams`, body, { headers });

        const getTeamResponse = await documentClient.get({
          TableName: process.env["core-table-name"] as string,
          Key: { pk: data.team.id, sk: data.team.id },
        }).promise();

        const team = getTeamResponse.Item as Record<string, unknown>;

        expect(team).toBeDefined();
        expect(team.entityType).toBe(EntityType.Team);
        expect(team.pk).toBe(data.team.id);
        expect(team.sk).toBe(data.team.id);
        expect(team.id).toBe(data.team.id);
        expect(team.name).toBe(name);
        expect(team.createdBy).toBe(user.id);
      } catch (error) {
        fail(error);
      }
    });

    it("creates a valid TeamUserRelationship entity", async () => {
      const name = generateRandomString(5);
      const body = { name };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { data } = await axios.post<{ team: Team; }>(`${baseUrl}/users/${user.id}/teams`, body, { headers });

        const getTeamUserRelationshipResponse = await documentClient.get({
          TableName: process.env["core-table-name"] as string,
          Key: { pk: data.team.id, sk: user.id },
        }).promise();

        const teamUserRelationship = getTeamUserRelationshipResponse.Item as Record<string, unknown>;

        expect(teamUserRelationship).toBeDefined();
        expect(teamUserRelationship.entityType).toBe(EntityType.TeamUserRelationship);
        expect(teamUserRelationship.pk).toBe(data.team.id);
        expect(teamUserRelationship.sk).toBe(user.id);
        expect(teamUserRelationship.gsi1pk).toBe(user.id);
        expect(teamUserRelationship.gsi1sk).toBe(data.team.id);
        expect(teamUserRelationship.teamId).toBe(data.team.id);
        expect(teamUserRelationship.userId).toBe(user.id);
        expect(teamUserRelationship.role).toBe(Role.Admin);
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
          await axios.post<{ team: Team; }>(`${baseUrl}/users/${user.id}/teams`, body, { headers });

          fail("Expected an error");
        } catch (error: unknown) {
          const axiosError = error as AxiosError;

          expect(axiosError.response?.status).toBe(401);
          expect(axiosError.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when passed an invalid user.id in the path", () => {
      it("throws a 400 error with a valid structure", async () => {
        const name = generateRandomString(5);
        const body = { name };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.post<{ team: Team; }>(`${baseUrl}/users/test/teams`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data.message).toBe("Error validating request");
          expect(error.response?.data.validationErrors.pathParameters.userId).toBe("Failed constraint check for string: Must be a user id");
        }
      });
    });
  });
});
