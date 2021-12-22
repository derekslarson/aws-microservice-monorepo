/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { OrganizationId, Role } from "@yac/util";
import { generateRandomString, URL_REGEX } from "../../../../e2e/util";
import { RawTeam } from "../../src/repositories/team.dynamo.repository";
import { createOrganization, createOrganizationUserRelationship, createRandomTeam } from "../util";
import { UserId } from "../../src/types/userId.type";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { RawOrganization } from "../../src/repositories/organization.dynamo.repository";

describe("GET /organizations/{organizationId}/teams (Get Teams by Organization Id)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;
  const mockUserId: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;
  const mockOrganizationId: OrganizationId = `${KeyPrefix.Organization}${generateRandomString()}`;

  let organization: RawOrganization;
  let teamA: RawTeam;
  let teamB: RawTeam;

  beforeAll(async () => {
    ({ organization } = await createOrganization({ createdBy: userId, name: generateRandomString() }));

    await createOrganizationUserRelationship({ organizationId: organization.id, userId, role: Role.Admin });

    // We need to wait create the teams in sequence, so that we can be sure of the return order in the test
    ({ team: teamA } = await createRandomTeam({ createdBy: userId, organizationId: organization.id }));
    ({ team: teamB } = await createRandomTeam({ createdBy: mockUserId, organizationId: organization.id }));
    // This team should not be returned as it is in a different org
    await createRandomTeam({ createdBy: mockUserId, organizationId: mockOrganizationId });
  });

  describe("under normal conditions", () => {
    describe("when not passed a 'limit' query param", () => {
      it("returns a valid response", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.get(`${baseUrl}/organizations/${organization.id}/teams`, { headers });

          expect(status).toBe(200);
          expect(data).toEqual({
            teams: [
              {
                id: teamB.id,
                name: teamB.name,
                createdBy: teamB.createdBy,
                organizationId: organization.id,
                image: jasmine.stringMatching(URL_REGEX),
              },
              {
                id: teamA.id,
                name: teamA.name,
                createdBy: teamA.createdBy,
                organizationId: organization.id,
                image: jasmine.stringMatching(URL_REGEX),
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
          const { status, data } = await axios.get(`${baseUrl}/organizations/${organization.id}/teams`, { params, headers });

          expect(status).toBe(200);
          expect(data).toEqual({
            teams: [
              {
                id: teamB.id,
                name: teamB.name,
                createdBy: teamB.createdBy,
                organizationId: organization.id,
                image: jasmine.stringMatching(URL_REGEX),
              },
            ],
            lastEvaluatedKey: jasmine.any(String),
          });

          const callTwoParams = { limit: 1, exclusiveStartKey: data.lastEvaluatedKey };

          const { status: callTwoStatus, data: callTwoData } = await axios.get(`${baseUrl}/organizations/${organization.id}/teams`, { params: callTwoParams, headers });

          expect(callTwoStatus).toBe(200);
          expect(callTwoData).toEqual({
            teams: [
              {
                id: teamA.id,
                name: teamA.name,
                createdBy: teamA.createdBy,
                organizationId: organization.id,
                image: jasmine.stringMatching(URL_REGEX),
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
    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const headers = {};

        try {
          await axios.get(`${baseUrl}/organizations/${organization.id}/teams`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when passed an organizationId the user is not an admin of", () => {
      let organizationTwo: RawOrganization;

      beforeEach(async () => {
        ({ organization: organizationTwo } = await createOrganization({ createdBy: mockUserId, name: generateRandomString() }));
      });

      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.get(`${baseUrl}/organizations/${organizationTwo.id}/teams`, { headers });

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
          await axios.get(`${baseUrl}/organizations/test/teams`, { params, headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { organizationId: "Failed constraint check for string: Must be an organization id" },
              queryStringParameters: { limit: "Failed constraint check for string: Must be a whole number" },
            },
          });
        }
      });
    });
  });
});
