/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios, { AxiosError } from "axios";
import { Role } from "@yac/core";
import { generateRandomString, documentClient } from "../../../../config/jasmine/e2e.util";
import { Team } from "../../src/mediator-services/team.mediator.service";
import { EntityType } from "../../src/enums/entityType.enum";
import { UserId } from "../../src/types/userId.type";

describe("POST /users/{userId}/teams (Create Team)", () => {
  const environment = process.env.environment as string;
  const baseUrl = `https://${environment}.yacchat.com/entity-service`;

  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;

  describe("under normal conditions", () => {
    it("returns a valid response", async () => {
      const name = generateRandomString(5);
      const body = { name };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.post<{ team: Team; }>(`${baseUrl}/users/${userId}/teams`, body, { headers });

        expect(status).toBe(201);
        expect(data.team).toBeDefined();
        expect(data.team.id).toMatch(/team-.*/);
        expect(data.team.name).toBe(name);
        expect(data.team.createdBy).toBe(userId);
      } catch (error) {
        fail(error);
      }
    });

    it("creates a valid Team entity", async () => {
      const name = generateRandomString(5);
      const body = { name };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { data } = await axios.post<{ team: Team; }>(`${baseUrl}/users/${userId}/teams`, body, { headers });

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
        expect(team.createdBy).toBe(userId);
      } catch (error) {
        fail(error);
      }
    });

    it("creates a valid TeamUserRelationship entity", async () => {
      const name = generateRandomString(5);
      const body = { name };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { data } = await axios.post<{ team: Team; }>(`${baseUrl}/users/${userId}/teams`, body, { headers });

        const getTeamUserRelationshipResponse = await documentClient.get({
          TableName: process.env["core-table-name"] as string,
          Key: { pk: data.team.id, sk: userId },
        }).promise();

        const teamUserRelationship = getTeamUserRelationshipResponse.Item as Record<string, unknown>;

        expect(teamUserRelationship).toBeDefined();
        expect(teamUserRelationship.entityType).toBe(EntityType.TeamUserRelationship);
        expect(teamUserRelationship.pk).toBe(data.team.id);
        expect(teamUserRelationship.sk).toBe(userId);
        expect(teamUserRelationship.gsi1pk).toBe(userId);
        expect(teamUserRelationship.gsi1sk).toBe(data.team.id);
        expect(teamUserRelationship.teamId).toBe(data.team.id);
        expect(teamUserRelationship.userId).toBe(userId);
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
          await axios.post(`${baseUrl}/users/${userId}/teams`, body, { headers });

          fail("Expected an error");
        } catch (error: unknown) {
          const axiosError = error as AxiosError;

          expect(axiosError.response?.status).toBe(401);
          expect(axiosError.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when passed invalid parameters", () => {
      it("throws a 400 error with a valid structure", async () => {
        const body = {};
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.post(`${baseUrl}/users/test/teams`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { userId: "Failed constraint check for string: Must be a user id" },
              body: { name: "Expected string, but was missing" },
            },
          });
        }
      });
    });
  });
});
