/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { Role } from "@yac/core";
import { RawTeam } from "../../src/repositories/team.dynamo.repository";
import { createRandomTeam, createTeamUserRelationship, getTeamUserRelationship } from "../util";
import { UserId } from "../../src/types/userId.type";
import { createRandomUser } from "../../../../e2e/util";
import { EntityType } from "../../src/enums/entityType.enum";

describe("POST /teams/{teamId}/users (Add User to Team)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;

  let teamA: RawTeam;
  let teamB: RawTeam;
  let otherUser: { id: `user-${string}`, email: string; };

  beforeAll(async () => {
    ([ { team: teamA }, { team: teamB }, { user: otherUser } ] = await Promise.all([
      createRandomTeam({ createdBy: userId }),
      createRandomTeam({ createdBy: "user-abcd" }),
      createRandomUser(),
    ]));

    await createTeamUserRelationship({ userId, teamId: teamA.id, role: Role.Admin });
  });

  describe("under normal conditions", () => {
    it("returns a valid response", async () => {
      const body = { userId: otherUser.id, role: Role.User };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.post<{ message: string; }>(`${baseUrl}/teams/${teamA.id}/users`, body, { headers });

        expect(status).toBe(200);
        expect(data).toEqual({ message: "User added to team." });
      } catch (error) {
        fail(error);
      }
    });

    it("creates a valid TeamUserRelationship entity", async () => {
      const body = { userId: otherUser.id, role: Role.User };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        await axios.post<{ message: string; }>(`${baseUrl}/teams/${teamA.id}/users`, body, { headers });

        const { teamUserRelationship } = await getTeamUserRelationship({ teamId: teamA.id, userId: otherUser.id });

        expect(teamUserRelationship).toEqual({
          entityType: EntityType.TeamUserRelationship,
          pk: teamA.id,
          sk: otherUser.id,
          gsi1pk: otherUser.id,
          gsi1sk: teamA.id,
          teamId: teamA.id,
          userId: otherUser.id,
          role: Role.User,
        });
      } catch (error) {
        fail(error);
      }
    });
  });

  describe("under error conditions", () => {
    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const body = { userId: otherUser.id, role: Role.User };
        const headers = {};

        try {
          await axios.post(`${baseUrl}/teams/${teamA.id}/users`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an id of a team the user is not an admin of is passed in", () => {
      it("throws a 403 error", async () => {
        const body = { userId: otherUser.id, role: Role.User };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.post(`${baseUrl}/teams/${teamB.id}/users`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(403);
          expect(error.response?.statusText).toBe("Forbidden");
        }
      });
    });

    describe("when passed invalid parameters", () => {
      it("throws a 400 error with a valid structure", async () => {
        const body = { };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.post(`${baseUrl}/teams/pants/users`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { teamId: "Failed constraint check for string: Must be a team id" },
              body: {
                userId: "Expected string, but was missing",
                role: 'Expected "super_admin" | "admin" | "user", but was missing',
              },
            },
          });
        }
      });
    });
  });
});
