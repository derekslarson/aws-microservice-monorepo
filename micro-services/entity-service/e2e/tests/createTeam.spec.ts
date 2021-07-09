/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { Role } from "@yac/core";
import { generateRandomString } from "../../../../e2e/util";
import { Team } from "../../src/mediator-services/team.mediator.service";
import { EntityType } from "../../src/enums/entityType.enum";
import { UserId } from "../../src/types/userId.type";
import { getTeam, getTeamUserRelationship } from "../util";

describe("POST /users/{userId}/teams (Create Team)", () => {
  const baseUrl = process.env.baseUrl as string;
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
        expect(data).toEqual({
          team: {
            id: jasmine.stringMatching(/team-.*/),
            name,
            createdBy: userId,
            role: Role.Admin,
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
        const { data } = await axios.post<{ team: Team; }>(`${baseUrl}/users/${userId}/teams`, body, { headers });

        const { team } = await getTeam({ teamId: data.team.id });

        expect(team).toBeDefined();
        expect(team?.entityType).toBe(EntityType.Team);
        expect(team?.pk).toBe(data.team.id);
        expect(team?.sk).toBe(data.team.id);
        expect(team?.id).toBe(data.team.id);
        expect(team?.name).toBe(name);
        expect(team?.createdBy).toBe(userId);
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

        const { teamUserRelationship } = await getTeamUserRelationship({ teamId: data.team.id, userId });

        expect(teamUserRelationship).toBeDefined();
        expect(teamUserRelationship?.entityType).toBe(EntityType.TeamUserRelationship);
        expect(teamUserRelationship?.pk).toBe(data.team.id);
        expect(teamUserRelationship?.sk).toBe(userId);
        expect(teamUserRelationship?.gsi1pk).toBe(userId);
        expect(teamUserRelationship?.gsi1sk).toBe(data.team.id);
        expect(teamUserRelationship?.teamId).toBe(data.team.id);
        expect(teamUserRelationship?.userId).toBe(userId);
        expect(teamUserRelationship?.role).toBe(Role.Admin);
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
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
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
