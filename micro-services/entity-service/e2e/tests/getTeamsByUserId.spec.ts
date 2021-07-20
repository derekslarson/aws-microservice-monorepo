/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { Role, WithRole } from "@yac/core";
import { generateRandomString, getAccessTokenByEmail } from "../../../../e2e/util";
import { Team } from "../../src/mediator-services/team.mediator.service";
import { RawTeam } from "../../src/repositories/team.dynamo.repository";
import { createRandomUser, createRandomTeam, createTeamUserRelationship } from "../util";
import { UserId } from "../../src/types/userId.type";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";

describe("GET /users/{userId}/teams (Get Teams by User Id)", () => {
  const baseUrl = process.env.baseUrl as string;

  const mockUserId: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;

  describe("under normal conditions", () => {
    let userId: UserId;
    let accessToken: string;
    let teamA: RawTeam;
    let teamB: RawTeam;

    beforeAll(async () => {
      // We have to fetch a new base user and access token here to prevent bleed over from other tests
      const { user } = await createRandomUser();
      userId = user.id;

      ([ { accessToken }, { team: teamA } ] = await Promise.all([
        getAccessTokenByEmail(user.email),
        createRandomTeam({ createdBy: userId }),
      ]));

      // We need to wait create the teams in sequence, so that we can be sure of the return order in the test

      ({ team: teamB } = await createRandomTeam({ createdBy: mockUserId }));

      await Promise.all([
        createTeamUserRelationship({ userId, teamId: teamA.id, role: Role.Admin }),
        createTeamUserRelationship({ userId, teamId: teamB.id, role: Role.User }),
      ]);
    });

    describe("when not passed a 'limit' query param", () => {
      it("returns a valid response", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.get<{ teams: WithRole<Team>[]; }>(`${baseUrl}/users/${userId}/teams`, { headers });

          expect(status).toBe(200);
          expect(data).toEqual({
            teams: [
              {
                id: teamA.id,
                name: teamA.name,
                createdBy: teamA.createdBy,
                role: Role.Admin,
              },
              {
                id: teamB.id,
                name: teamB.name,
                createdBy: teamB.createdBy,
                role: Role.User,
              },
            ],
          });
        } catch (error) {
          fail(error);
        }
      });
    });

    describe("when passed a 'limit' query param smaller than the number of entities", () => {
      it("returns a valid response", async () => {
        const params = { limit: 1 };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.get<{ teams: WithRole<Team>[]; lastEvaluatedKey: string; }>(`${baseUrl}/users/${userId}/teams`, { params, headers });

          expect(status).toBe(200);
          expect(data).toEqual({
            teams: [
              {
                id: teamA.id,
                name: teamA.name,
                createdBy: teamA.createdBy,
                role: Role.Admin,
              },
            ],
            lastEvaluatedKey: jasmine.any(String),
          });

          const callTwoParams = { limit: 1, exclusiveStartKey: data.lastEvaluatedKey };

          const { status: callTwoStatus, data: callTwoData } = await axios.get<{ teams: WithRole<Team>[]; }>(
            `${baseUrl}/users/${userId}/teams`,
            { params: callTwoParams, headers },
          );

          expect(callTwoStatus).toBe(200);
          expect(callTwoData).toEqual({
            teams: [
              {
                id: teamB.id,
                name: teamB.name,
                createdBy: teamB.createdBy,
                role: Role.User,
              },
            ],
          });
        } catch (error) {
          fail(error);
        }
      });
    });
  });

  describe("under error conditions", () => {
    const userId = process.env.userId as UserId;
    const accessToken = process.env.accessToken as string;

    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const headers = {};

        try {
          await axios.get(`${baseUrl}/users/${userId}/teams`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when a userId of a user different than the id in the accessToken is passed in", () => {
      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.get(`${baseUrl}/users/${mockUserId}/teams`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(403);
          expect(error.response?.statusText).toBe("Forbidden");
        }
      });
    });

    describe("when passed invalid parameters", () => {
      it("throws a 400 error with a valid structure", async () => {
        const params = { limit: "pants" };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.get(`${baseUrl}/users/test/teams`, { params, headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { userId: "Failed constraint check for string: Must be a user id" },
              queryStringParameters: { limit: "Failed constraint check for string: Must be a whole number" },
            },
          });
        }
      });
    });
  });
});
