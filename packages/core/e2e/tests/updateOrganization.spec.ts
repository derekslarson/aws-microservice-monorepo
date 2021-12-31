/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import axios from "axios";
import { Role } from "@yac/util";
import { createRandomAuthServiceUser, generateRandomString, getAccessToken } from "../../../../e2e/util";
import { createOrganization, CreateOrganizationOutput, createOrganizationUserRelationship, getOrganization } from "../util";
import { UserId } from "../../src/types/userId.type";

describe("PATCH /organizations/{organizationId} (Update Organization)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;

  let organization: CreateOrganizationOutput["organization"];

  beforeEach(async () => {
    ({ organization } = await createOrganization({ createdBy: userId, name: generateRandomString() }));
    await createOrganizationUserRelationship({ organizationId: organization.id, userId, role: Role.Admin });
  });

  describe("under normal conditions", () => {
    describe("when passed 'name' value", () => {
      const body = { name: generateRandomString(5) };

      it("returns a valid response", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.patch(`${baseUrl}/organizations/${organization.id}`, body, { headers });

          expect(status).toBe(200);
          expect(data).toEqual({ message: "Organization updated." });
        } catch (error) {
          fail(error);
        }
      });

      it("updates the Organization entity", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.patch(`${baseUrl}/organizations/${organization.id}`, body, { headers });

          const { organization: organizationEntity } = await getOrganization({ organizationId: organization.id });

          if (!organizationEntity) {
            throw new Error("organization entity not found");
          }

          expect(organizationEntity).toEqual({
            ...organizationEntity,
            ...body,
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
        const body = { name: generateRandomString(5) };

        try {
          await axios.patch(`${baseUrl}/organizations/${organization.id}`, body, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an access token from a user who is not admin from the organization is passed in", () => {
      it("throws a 403 error", async () => {
        const randomUser = await createRandomAuthServiceUser();
        const { accessToken: wrongAccessToken } = await getAccessToken(randomUser.id);
        const headers = { Authorization: `Bearer ${wrongAccessToken}` };
        const body = { name: generateRandomString(5) };

        try {
          await axios.patch(`${baseUrl}/organizations/${organization.id}`, body, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(403);
          expect(error.response?.statusText).toBe("Forbidden");
        }
      });
    });

    describe("when passed invalid parameters", () => {
      it("throws a 400 error with a valid structure", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const body = { name: false };

        try {
          await axios.patch(`${baseUrl}/organizations/test`, body, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { organizationId: "Failed constraint check for string: Must be an organization id" },
              body: { name: "Expected string, but was boolean" },
            },
          });
        }
      });
    });
  });
});
