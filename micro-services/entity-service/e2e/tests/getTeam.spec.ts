/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { Role } from "@yac/core";
import { Team } from "../../src/mediator-services/team.mediator.service";
import { RawTeam } from "../../src/repositories/team.dynamo.repository";
import { createRandomTeam, createTeamUserRelationship } from "../util";
import { UserId } from "../../src/types/userId.type";

describe("GET /teams/{teamId} (Get Team)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;

  let teamA: RawTeam;
  let teamB: RawTeam;

  beforeAll(async () => {
    ([ { team: teamA }, { team: teamB } ] = await Promise.all([
      createRandomTeam({ createdBy: userId }),
      createRandomTeam({ createdBy: "user-abc-123" }),
    ]));

    await createTeamUserRelationship({ userId, teamId: teamA.id, role: Role.Admin });
  });

  describe("under normal conditions", () => {
    it("returns a valid response", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.get<{ team: Team; }>(`${baseUrl}/teams/${teamA.id}`, { headers });

        expect(status).toBe(200);
        expect(data).toEqual({
          team: {
            id: teamA.id,
            name: teamA.name,
            createdBy: teamA.createdBy,
          },
        });
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
          await axios.get(`${baseUrl}/teams/${teamA.id}`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when a teamId of a team the user is not a member of is passed in", () => {
      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.get(`${baseUrl}/teams/${teamB.id}`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(403);
          expect(error.response?.statusText).toBe("Forbidden");
        }
      });
    });

    describe("when passed invalid parameters", () => {
      it("throws a 400 error with a valid structure", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.get(`${baseUrl}/teams/test`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: { pathParameters: { teamId: "Failed constraint check for string: Must be a team id" } },
          });
        }
      });
    });
  });
});
