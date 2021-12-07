/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { Role } from "@yac/util";
import { generateRandomString, URL_REGEX } from "../../../../e2e/util";
import { Organization } from "../../src/mediator-services/organization.mediator.service";
import { EntityType } from "../../src/enums/entityType.enum";
import { UserId } from "../../src/types/userId.type";
import { getOrganization, getOrganizationUserRelationship } from "../util";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { ImageMimeType } from "../../src/enums/image.mimeType.enum";

fdescribe("POST /users/{userId}/organizations (Create Organization)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;
  // const organizationCreatedSnsTopicArn = process.env["organization-created-sns-topic-arn"] as string;

  describe("under normal conditions", () => {
    it("returns a valid response", async () => {
      const name = generateRandomString(5);
      const body = { name };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.post(`${baseUrl}/users/${userId}/organizations`, body, { headers });

        expect(status).toBe(201);
        expect(data).toEqual({
          organization: {
            id: jasmine.stringMatching(new RegExp(`${KeyPrefix.Organization}.*`)),
            name,
            createdBy: userId,
            role: Role.Admin,
            image: jasmine.stringMatching(URL_REGEX),
          },
        });
      } catch (error) {
        fail(error);
      }
    });

    it("creates a valid Organization entity", async () => {
      const name = generateRandomString(5);
      const body = { name };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { data } = await axios.post<{ organization: Organization; }>(`${baseUrl}/users/${userId}/organizations`, body, { headers });

        const { organization } = await getOrganization({ organizationId: data.organization.id });

        expect(organization).toEqual({
          entityType: EntityType.Organization,
          pk: data.organization.id,
          sk: EntityType.Organization,
          id: data.organization.id,
          createdBy: userId,
          name,
          imageMimeType: ImageMimeType.Png,
        });
      } catch (error) {
        fail(error);
      }
    });

    it("creates a valid OrganizationUserRelationship entity", async () => {
      const name = generateRandomString(5);
      const body = { name };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { data } = await axios.post<{ organization: Organization; }>(`${baseUrl}/users/${userId}/organizations`, body, { headers });

        const { organizationUserRelationship } = await getOrganizationUserRelationship({ organizationId: data.organization.id, userId });

        expect(organizationUserRelationship).toEqual({
          entityType: EntityType.OrganizationUserRelationship,
          pk: data.organization.id,
          sk: userId,
          gsi1pk: userId,
          gsi1sk: data.organization.id,
          organizationId: data.organization.id,
          role: Role.Admin,
          userId,
        });
      } catch (error) {
        fail(error);
      }
    });

    // it("publishes a valid SNS message", async () => {
    //   // clear the sns events table so the test can have a clean slate
    //   await deleteSnsEventsByTopicArn({ topicArn: organizationCreatedSnsTopicArn });

    //   const name = generateRandomString(5);
    //   const body = { name };
    //   const headers = { Authorization: `Bearer ${accessToken}` };

    //   try {
    //     const { data } = await axios.post(`${baseUrl}/users/${userId}/organizations`, body, { headers });

    //     const [ { user }, { organization } ] = await Promise.all([
    //       getUser({ userId }),
    //       getOrganization({ organizationId: data.organization.id }),
    //     ]);

    //     if (!user || !organization) {
    //       throw new Error("necessary records not created");
    //     }

    //     // wait the event has been fired
    //     const { snsEvents } = await backoff(
    //       () => getSnsEventsByTopicArn<OrganizationCreatedSnsMessage>({ topicArn: organizationCreatedSnsTopicArn }),
    //       (response) => response.snsEvents.length === 1,
    //     );

    //     expect(snsEvents.length).toBe(1);

    //     expect(snsEvents[0]).toEqual(jasmine.objectContaining({
    //       message: {
    //         organizationMemberIds: [ userId ],
    //         organization: {
    //           createdBy: organization.createdBy,
    //           id: organization.id,
    //           image: jasmine.stringMatching(URL_REGEX),
    //           name: organization.name,
    //         },
    //       },
    //     }));
    //   } catch (error) {
    //     fail(error);
    //   }
    // });
  });

  describe("under error conditions", () => {
    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const name = generateRandomString(5);
        const body = { name };
        const headers = {};

        try {
          await axios.post(`${baseUrl}/users/${userId}/organizations`, body, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when passed invalid parameters", () => {
      it("throws a 400 error with a valid structure", async () => {
        const body = {};
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.post(`${baseUrl}/users/test/organizations`, body, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { userId: "Failed constraint check for string: Must be a user id" },
              body: { name: "Expected string, but was missing" },
            },
          });
        }
      });
    });
  });
});
