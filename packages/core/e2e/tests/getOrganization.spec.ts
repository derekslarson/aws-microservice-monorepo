/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { OrganizationId, Role } from "@yac/util";
import { RawOrganization } from "../../src/repositories/organization.dynamo.repository";
import { createOrganization, createOrganizationUserRelationship } from "../util";
import { UserId } from "../../src/types/userId.type";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { generateRandomString, URL_REGEX } from "../../../../e2e/util";

describe("GET /organizations/{organizationId} (Get Organization)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;

  describe("under normal conditions", () => {
    let organization: RawOrganization;

    beforeAll(async () => {
      ({ organization } = await createOrganization({ createdBy: userId, name: generateRandomString() }));

      await createOrganizationUserRelationship({ userId, organizationId: organization.id, role: Role.Admin });
    });

    it("returns a valid response", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.get(`${baseUrl}/organizations/${organization.id}`, { headers });

        expect(status).toBe(200);
        expect(data).toEqual({
          organization: {
            id: organization.id,
            name: organization.name,
            createdBy: organization.createdBy,
            image: jasmine.stringMatching(URL_REGEX),
          },
        });
      } catch (error) {
        fail(error);
      }
    });
  });

  describe("under error conditions", () => {
    const mockOrganizationId: OrganizationId = `${KeyPrefix.Organization}${generateRandomString(5)}`;

    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const headers = {};

        try {
          await axios.get(`${baseUrl}/organizations/${mockOrganizationId}`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when a organizationId of a organization the user is not a member of is passed in", () => {
      const mockUserId: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;

      let organization: RawOrganization;

      beforeAll(async () => {
        ({ organization } = await createOrganization({ createdBy: mockUserId, name: generateRandomString() }));
      });

      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.get(`${baseUrl}/organizations/${organization.id}`, { headers });

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
          await axios.get(`${baseUrl}/organizations/test`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: { pathParameters: { organizationId: "Failed constraint check for string: Must be an organization id" } },
          });
        }
      });
    });
  });
});
