/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import axios from "axios";
import { OrganizationId, Role } from "@yac/util";
import { generateRandomString, URL_REGEX, wait } from "../../../../e2e/util";
import { RawTeam } from "../../src/repositories/team.dynamo.repository";
import { createConversationUserRelationship, createMeeting, createRandomTeam, createTeamUserRelationship } from "../util";
import { UserId } from "../../src/types/userId.type";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { Meeting, RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { TeamId } from "../../src/types/teamId.type";
import { ConversationType } from "../../src/enums/conversationType.enum";

describe("GET /teams/{teamId}/meetings (Get Meetings by Team Id)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;

  const mockUserId: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;
  const mockTeamId: TeamId = `${KeyPrefix.Team}${generateRandomString(5)}`;
  const mockOrganizationId: OrganizationId = `${KeyPrefix.Organization}${generateRandomString()}`;

  describe("under normal conditions", () => {
    let team: RawTeam;
    let meeting: RawConversation<Meeting>;
    let meetingTwo: RawConversation<Meeting>;

    beforeAll(async () => {
      ({ team } = await createRandomTeam({ createdBy: mockUserId, organizationId: mockOrganizationId }));

      // We need to wait create the meetings in sequence, so that we can be sure of the return order in the test
      ({ conversation: meeting } = await createMeeting({ createdBy: mockUserId, organizationId: mockOrganizationId, name: generateRandomString(5), teamId: team.id, dueDate: new Date().toISOString() }));

      await wait(1000);

      ({ conversation: meetingTwo } = await createMeeting({ createdBy: mockUserId, organizationId: mockOrganizationId, name: generateRandomString(5), teamId: team.id, dueDate: new Date().toISOString() }));

      await Promise.all([
        createTeamUserRelationship({ userId, teamId: team.id, role: Role.User }),
        createConversationUserRelationship({ type: ConversationType.Meeting, conversationId: meeting.id, userId, role: Role.User }),
        createConversationUserRelationship({ type: ConversationType.Meeting, conversationId: meetingTwo.id, userId, role: Role.User }),
      ]);
    });

    describe("when not passed a 'limit' query param", () => {
      it("returns a valid response", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.get(`${baseUrl}/teams/${team.id}/meetings`, { headers });

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
                image: jasmine.stringMatching(URL_REGEX),
                type: ConversationType.Meeting,
              },
              {
                id: meetingTwo.id,
                organizationId: mockOrganizationId,
                name: meetingTwo.name,
                createdBy: meetingTwo.createdBy,
                createdAt: meetingTwo.createdAt,
                teamId: meetingTwo.teamId,
                dueDate: meetingTwo.dueDate,
                image: jasmine.stringMatching(URL_REGEX),
                type: ConversationType.Meeting,
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
          const { status, data } = await axios.get(`${baseUrl}/teams/${team.id}/meetings`, { params, headers });

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
                image: jasmine.stringMatching(URL_REGEX),
                type: ConversationType.Meeting,
              },
            ],
            lastEvaluatedKey: jasmine.any(String),
          });

          const callTwoParams = { limit: 1, exclusiveStartKey: data.lastEvaluatedKey };

          const { status: callTwoStatus, data: callTwoData } = await axios.get(
            `${baseUrl}/teams/${team.id}/meetings`,
            { params: callTwoParams, headers },
          );

          expect(callTwoStatus).toBe(200);
          expect(callTwoData).toEqual({
            meetings: [
              {
                id: meetingTwo.id,
                organizationId: mockOrganizationId,
                name: meetingTwo.name,
                createdBy: meetingTwo.createdBy,
                createdAt: meetingTwo.createdAt,
                teamId: meetingTwo.teamId,
                dueDate: meetingTwo.dueDate,
                image: jasmine.stringMatching(URL_REGEX),
                type: ConversationType.Meeting,
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
          await axios.get(`${baseUrl}/teams/${mockTeamId}/meetings`, { headers });

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
          await axios.get(`${baseUrl}/teams/${mockTeamId}/meetings`, { headers });

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
          await axios.get(`${baseUrl}/teams/test/meetings`, { params, headers });

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
