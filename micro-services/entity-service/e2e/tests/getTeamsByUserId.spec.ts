/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios, { AxiosError } from "axios";
import { Role } from "@yac/core";
import { Team } from "../../src/mediator-services/team.mediator.service";
import { RawTeam } from "../../src/repositories/team.dynamo.repository";
import { createRandomTeam, createTeamUserRelationship } from "../util";
import { UserId } from "../../src/types/userId.type";

fdescribe("GET /users/{userId}/teams (Get Teams by User Id)", () => {
  const environment = process.env.environment as string;
  const baseUrl = `https://${environment}.yacchat.com/entity-service`;

  const userId = process.env.userId as UserId;
  const otherUserIdA = "user-abc-123";
  const otherUserIdB = "user-def-456";
  const accessToken = process.env.accessToken as string;
  let teamA: RawTeam;
  let teamB: RawTeam;
  let teamC: RawTeam;

  beforeAll(async () => {
    ([ { team: teamA }, { team: teamB }, { team: teamC } ] = await Promise.all([
      createRandomTeam({ createdBy: userId }),
      createRandomTeam({ createdBy: otherUserIdA }),
      createRandomTeam({ createdBy: otherUserIdB }),
    ]));

    await Promise.all([
      createTeamUserRelationship({ userId, teamId: teamA.id, role: Role.Admin }),
      createTeamUserRelationship({ userId, teamId: teamB.id, role: Role.User }),
    ]);
  });

  describe("under normal conditions", () => {
    it("returns a valid response", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.get<{ teams: Team[]; }>(`${baseUrl}/users/${userId}/teams`, { headers });

        expect(status).toBe(200);
        expect(data.teams).toBeDefined();
        expect(data.teams).toEqual(jasmine.any(Array));
        expect(data.teams.length).toBe(2);
        expect(data.teams).toContain(jasmine.objectContaining({ id: teamA.id, name: teamA.name, createdBy: teamA.createdBy, role: Role.Admin }));
        expect(data.teams).toContain(jasmine.objectContaining({ id: teamB.id, name: teamB.name, createdBy: teamB.createdBy, role: Role.User }));
        expect(data.teams).not.toContain(jasmine.objectContaining({ id: teamC.id, name: teamC.name, createdBy: teamC.createdBy }));
      } catch (error) {
        fail(error);
      }
    });
  });

  describe("under error conditions", () => {
    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const headers = {};

        try {
          await axios.get(`${baseUrl}/users/${userId}/teams`, { headers });

          fail("Expected an error");
        } catch (error: unknown) {
          const axiosError = error as AxiosError;

          expect(axiosError.response?.status).toBe(401);
          expect(axiosError.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when a userId of a user different than the id int he accessToken is passed in", () => {
      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.get(`${baseUrl}/users/${otherUserIdA}/teams`, { headers });

          fail("Expected an error");
        } catch (error: unknown) {
          const axiosError = error as AxiosError;

          expect(axiosError.response?.status).toBe(403);
          expect(axiosError.response?.statusText).toBe("Forbidden");
        }
      });
    });

    describe("when passed invalid parameters", () => {
      it("throws a 400 error with a valid structure", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.get(`${baseUrl}/users/test/teams`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: { pathParameters: { userId: "Failed constraint check for string: Must be a user id" } },
          });
        }
      });
    });
  });
});
