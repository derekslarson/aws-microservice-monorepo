/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { Role, WithRole } from "@yac/core";
import { createRandomUser, generateRandomString } from "../../../../e2e/util";
import { RawTeam } from "../../src/repositories/team.dynamo.repository";
import { createRandomTeam, createTeamUserRelationship } from "../util";
import { UserId } from "../../src/types/userId.type";
import { User } from "../../src/mediator-services/user.mediator.service";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { TeamId } from "../../src/types/teamId.type";

describe("GET /teams/{teamId}/users (Get Users by Team Id)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const userEmail = process.env.userEmail as UserId;
  const accessToken = process.env.accessToken as string;

  const mockTeamId: TeamId = `${KeyPrefix.Team}${generateRandomString(5)}`;

  describe("under normal conditions", () => {
    let team: RawTeam;
    let otherUser: { id: `${KeyPrefix.User}${string}`, email: string; };
    let expectedUsersSorted: { id: `${KeyPrefix.User}${string}`; email: string; role: Role; }[];

    beforeAll(async () => {
      ({ user: otherUser } = await createRandomUser());

      ({ team } = await createRandomTeam({ createdBy: userId }));

      await Promise.all([
        createTeamUserRelationship({ userId, teamId: team.id, role: Role.Admin }),
        createTeamUserRelationship({ userId: otherUser.id, teamId: team.id, role: Role.User }),
      ]);

      // since user ids come from Cognito, we can't guarantee their sort order based off order of creation,
      // so we need to establish it here
      const expectedUsers = [ { id: userId, email: userEmail, role: Role.Admin }, { id: otherUser.id, email: otherUser.email, role: Role.User } ];
      expectedUsersSorted = expectedUsers.sort((userA, userB) => (userA.id > userB.id ? 1 : -1));
    });

    describe("when not passed a 'limit' query param", () => {
      it("returns a valid response", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.get<{ users: WithRole<User>[]; }>(`${baseUrl}/teams/${team.id}/users`, { headers });

          expect(status).toBe(200);
          expect(data).toEqual({ users: expectedUsersSorted });
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
          const { status, data } = await axios.get<{ users: WithRole<User>[]; lastEvaluatedKey: string; }>(`${baseUrl}/teams/${team.id}/users`, { params, headers });

          expect(status).toBe(200);
          expect(data).toEqual({
            users: [
              expectedUsersSorted[0],
            ],
            lastEvaluatedKey: jasmine.any(String),
          });

          const callTwoParams = { limit: 1, exclusiveStartKey: data.lastEvaluatedKey };

          const { status: callTwoStatus, data: callTwoData } = await axios.get<{ users: WithRole<User>[]; }>(
            `${baseUrl}/teams/${team.id}/users`,
            { params: callTwoParams, headers },
          );

          expect(callTwoStatus).toBe(200);
          expect(callTwoData).toEqual({
            users: [
              expectedUsersSorted[1],
            ],
          });
        } catch (error) {
          fail(error);
        }
      });
    });
  });

  describe("under error conditions", () => {
    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const headers = {};

        try {
          await axios.get(`${baseUrl}/teams/${mockTeamId}/users`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an id of a team the user is not a member of is passed in", () => {
      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.get(`${baseUrl}/teams/${mockTeamId}/users`, { headers });

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
          await axios.get(`${baseUrl}/teams/test/users`, { params, headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { teamId: "Failed constraint check for string: Must be a team id" },
              queryStringParameters: { limit: "Failed constraint check for string: Must be a whole number" },
            },
          });
        }
      });
    });
  });
});
