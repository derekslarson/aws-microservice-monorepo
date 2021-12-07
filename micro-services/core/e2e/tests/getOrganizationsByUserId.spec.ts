/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { Role } from "@yac/util";
import { createRandomAuthServiceUser, generateRandomString, getAccessTokenByEmail, URL_REGEX } from "../../../../e2e/util";
import { RawOrganization } from "../../src/repositories/organization.dynamo.repository";
import { createOrganization, createOrganizationUserRelationship } from "../util";
import { UserId } from "../../src/types/userId.type";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";

fdescribe("GET /users/{userId}/organizations (Get Organizations by User Id)", () => {
  const baseUrl = process.env.baseUrl as string;

  const mockUserId: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;

  describe("under normal conditions", () => {
    let userId: UserId;
    let accessToken: string;
    let organizationA: RawOrganization;
    let organizationB: RawOrganization;

    beforeAll(async () => {
      // We have to fetch a new base user and access token here to prevent bleed over from other tests
      const user = await createRandomAuthServiceUser();
      userId = user.id;

      ([ { accessToken }, { organization: organizationA } ] = await Promise.all([
        getAccessTokenByEmail(user.email),
        createOrganization({ createdBy: userId, name: generateRandomString() }),
      ]));

      // We need to wait create the organizations in sequence, so that we can be sure of the return order in the test

      ({ organization: organizationB } = await createOrganization({ createdBy: mockUserId, name: generateRandomString() }));

      await Promise.all([
        createOrganizationUserRelationship({ userId, organizationId: organizationA.id, role: Role.Admin }),
        createOrganizationUserRelationship({ userId, organizationId: organizationB.id, role: Role.User }),
      ]);
    });

    describe("when not passed a 'limit' query param", () => {
      it("returns a valid response", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.get(`${baseUrl}/users/${userId}/organizations`, { headers });

          expect(status).toBe(200);
          expect(data).toEqual({
            organizations: [
              {
                id: organizationA.id,
                name: organizationA.name,
                createdBy: organizationA.createdBy,
                role: Role.Admin,
                image: jasmine.stringMatching(URL_REGEX),
              },
              {
                id: organizationB.id,
                name: organizationB.name,
                createdBy: organizationB.createdBy,
                role: Role.User,
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
          const { status, data } = await axios.get(`${baseUrl}/users/${userId}/organizations`, { params, headers });

          expect(status).toBe(200);
          expect(data).toEqual({
            organizations: [
              {
                id: organizationA.id,
                name: organizationA.name,
                createdBy: organizationA.createdBy,
                role: Role.Admin,
                image: jasmine.stringMatching(URL_REGEX),
              },
            ],
            lastEvaluatedKey: jasmine.any(String),
          });

          const callTwoParams = { limit: 1, exclusiveStartKey: data.lastEvaluatedKey };

          const { status: callTwoStatus, data: callTwoData } = await axios.get(`${baseUrl}/users/${userId}/organizations`, { params: callTwoParams, headers });

          expect(callTwoStatus).toBe(200);
          expect(callTwoData).toEqual({
            organizations: [
              {
                id: organizationB.id,
                name: organizationB.name,
                createdBy: organizationB.createdBy,
                role: Role.User,
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
    const userId = process.env.userId as UserId;
    const accessToken = process.env.accessToken as string;

    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const headers = {};

        try {
          await axios.get(`${baseUrl}/users/${userId}/organizations`, { headers });

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
          await axios.get(`${baseUrl}/users/${mockUserId}/organizations`, { headers });

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
          await axios.get(`${baseUrl}/users/test/organizations`, { params, headers });

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
