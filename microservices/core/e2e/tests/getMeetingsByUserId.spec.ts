/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import axios from "axios";
import { OrganizationId, Role } from "@yac/util";
import { createConversationUserRelationship, createMeeting } from "../util";
import { UserId } from "../../src/types/userId.type";
import { Meeting, RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { createRandomAuthServiceUser, generateRandomString, getAccessTokenByEmail, URL_REGEX } from "../../../../e2e/util";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { ConversationType } from "../../src/enums/conversationType.enum";

describe("GET /users/{userId}/meetings (Get Meetings by User Id)", () => {
  const baseUrl = process.env.baseUrl as string;

  const mockUserId: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;
  const mockOrganizationId: OrganizationId = `${KeyPrefix.Organization}${generateRandomString()}`;

  describe("under normal conditions", () => {
    let userId: UserId;
    let accessToken: string;
    let meeting: RawConversation<Meeting>;
    let meetingTwo: RawConversation<Meeting>;

    beforeAll(async () => {
      // We have to fetch a new base user and access token here to prevent bleed over from other tests
      const user = await createRandomAuthServiceUser();
      userId = user.id;

      ([ { accessToken }, { conversation: meeting }, { conversation: meetingTwo } ] = await Promise.all([
        getAccessTokenByEmail(user.email),
        createMeeting({ createdBy: userId, organizationId: mockOrganizationId, name: generateRandomString(5), dueDate: new Date("12/25/2021").toISOString(), teamId: `${KeyPrefix.Team}${generateRandomString(5)}` }),
        createMeeting({ createdBy: mockUserId, organizationId: mockOrganizationId, name: generateRandomString(5), dueDate: new Date("12/26/2021").toISOString() }),
      ]));

      // We need to wait create the relationships in sequence, so that we can be sure of the return order in the test
      await createConversationUserRelationship({ type: ConversationType.Meeting, conversationId: meeting.id, userId, role: Role.Admin, dueDate: meeting.dueDate });
      await createConversationUserRelationship({ type: ConversationType.Meeting, conversationId: meetingTwo.id, userId, role: Role.User, dueDate: meetingTwo.dueDate });
    });

    describe("when not passed a 'limit' query param", () => {
      it("returns a valid response", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.get(`${baseUrl}/users/${userId}/meetings`, { headers });

          expect(status).toBe(200);
          expect(data).toEqual({
            meetings: [
              {
                id: meetingTwo.id,
                organizationId: mockOrganizationId,
                name: meetingTwo.name,
                createdBy: meetingTwo.createdBy,
                createdAt: meetingTwo.createdAt,
                dueDate: meetingTwo.dueDate,
                type: meetingTwo.type,
                role: Role.User,
                image: jasmine.stringMatching(URL_REGEX),
              },
              {
                id: meeting.id,
                organizationId: mockOrganizationId,
                name: meeting.name,
                createdBy: meeting.createdBy,
                createdAt: meeting.createdAt,
                teamId: meeting.teamId,
                dueDate: meeting.dueDate,
                type: meeting.type,
                role: Role.Admin,
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
          const { status, data } = await axios.get(`${baseUrl}/users/${userId}/meetings`, { params, headers });

          expect(status).toBe(200);
          expect(data).toEqual({
            meetings: [
              {
                id: meetingTwo.id,
                organizationId: mockOrganizationId,
                name: meetingTwo.name,
                createdBy: meetingTwo.createdBy,
                createdAt: meetingTwo.createdAt,
                dueDate: meetingTwo.dueDate,
                role: Role.User,
                type: meetingTwo.type,
                image: jasmine.stringMatching(URL_REGEX),
              },
            ],
            lastEvaluatedKey: jasmine.any(String),
          });

          const callTwoParams = { limit: 1, exclusiveStartKey: data.lastEvaluatedKey };

          const { status: callTwoStatus, data: callTwoData } = await axios.get(
            `${baseUrl}/users/${userId}/meetings`,
            { params: callTwoParams, headers },
          );

          expect(callTwoStatus).toBe(200);
          expect(callTwoData).toEqual({
            meetings: [
              {
                id: meeting.id,
                organizationId: mockOrganizationId,
                name: meeting.name,
                createdBy: meeting.createdBy,
                createdAt: meeting.createdAt,
                teamId: meeting.teamId,
                dueDate: meeting.dueDate,
                type: meeting.type,
                role: Role.Admin,
                image: jasmine.stringMatching(URL_REGEX),
              },
            ],
          });
        } catch (error) {
          fail(error);
        }
      });
    });

    describe("when passed a 'sortBy=dueDate' query param", () => {
      it("returns a valid response", async () => {
        const params = { sortBy: "dueDate" };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.get(`${baseUrl}/users/${userId}/meetings`, { params, headers });

          expect(status).toBe(200);
          expect(data).toEqual({
            meetings: [
              {
                id: meeting.id,
                organizationId: mockOrganizationId,
                name: meeting.name,
                createdBy: meeting.createdBy,
                createdAt: meeting.createdAt,
                teamId: meeting.teamId,
                dueDate: meeting.dueDate,
                type: meeting.type,
                role: Role.Admin,
                image: jasmine.stringMatching(URL_REGEX),
              },
              {
                id: meetingTwo.id,
                organizationId: mockOrganizationId,
                name: meetingTwo.name,
                createdBy: meetingTwo.createdBy,
                createdAt: meetingTwo.createdAt,
                dueDate: meetingTwo.dueDate,
                type: meetingTwo.type,
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
          await axios.get(`${baseUrl}/users/${userId}/meetings`, { headers });

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
          await axios.get(`${baseUrl}/users/${mockUserId}/meetings`, { headers });

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
          await axios.get(`${baseUrl}/users/test/meetings`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: { pathParameters: { userId: "Failed constraint check for string: Must be a user id" } },
          });
        }
      });
    });
  });
});
