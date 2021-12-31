/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { OrganizationId, Role } from "@yac/util";
import { RawTeam } from "../../src/repositories/team.dynamo.repository";
import { createRandomTeam, createTeamUserRelationship } from "../util";
import { UserId } from "../../src/types/userId.type";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { generateRandomString, URL_REGEX } from "../../../../e2e/util";
import { TeamId } from "../../src/types/teamId.type";

describe("GET /teams/{teamId} (Get Team)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;

  describe("under normal conditions", () => {
    let team: RawTeam;
    const mockOrganizationId: OrganizationId = `${KeyPrefix.Organization}${generateRandomString()}`;

    beforeAll(async () => {
      ({ team } = await createRandomTeam({ createdBy: userId, organizationId: mockOrganizationId }));

      await createTeamUserRelationship({ userId, teamId: team.id, role: Role.Admin });
    });

    it("returns a valid response", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.get(`${baseUrl}/teams/${team.id}`, { headers });

        expect(status).toBe(200);
        expect(data).toEqual({
          team: {
            id: team.id,
            name: team.name,
            createdBy: team.createdBy,
            organizationId: mockOrganizationId,
            image: jasmine.stringMatching(URL_REGEX),
          },
        });
      } catch (error) {
        fail(error);
      }
    });
  });

  describe("under error conditions", () => {
    const mockTeamId: TeamId = `${KeyPrefix.Team}${generateRandomString(5)}`;

    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const headers = {};

        try {
          await axios.get(`${baseUrl}/teams/${mockTeamId}`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when a teamId of a team the user is not a member of is passed in", () => {
      let team: RawTeam;
      const mockOrganizationId: OrganizationId = `${KeyPrefix.Organization}${generateRandomString()}`;
      const mockUserId: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;

      beforeAll(async () => {
        ({ team } = await createRandomTeam({ createdBy: mockUserId, organizationId: mockOrganizationId }));
      });

      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.get(`${baseUrl}/teams/${team.id}`, { headers });

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
