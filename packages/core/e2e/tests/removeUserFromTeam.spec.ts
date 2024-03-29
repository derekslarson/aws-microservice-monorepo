/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { OrganizationId, Role, UserRemovedFromTeamSnsMessage } from "@yac/util";
import { RawTeam } from "../../src/repositories/team.dynamo.repository";
import { createRandomTeam, createRandomUser, CreateRandomUserOutput, createTeamUserRelationship, deleteSnsEventsByTopicArn, getSnsEventsByTopicArn, getTeamUserRelationship } from "../util";
import { UserId } from "../../src/types/userId.type";
import { backoff, generateRandomString, URL_REGEX } from "../../../../e2e/util";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { TeamId } from "../../src/types/teamId.type";

describe("DELETE /teams/{teamId}/users/{userId} (Remove User from Team)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;
  const userRemovedFromTeamSnsTopicArn = process.env["user-removed-from-team-sns-topic-arn"] as string;

  const mockUserId: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;
  const mockTeamId: TeamId = `${KeyPrefix.Team}${generateRandomString(5)}`;

  describe("under normal conditions", () => {
    let team: RawTeam;
    let otherUser: CreateRandomUserOutput["user"];
    const mockOrganizationId: OrganizationId = `${KeyPrefix.Organization}${generateRandomString()}`;

    beforeAll(async () => {
      ({ user: otherUser } = await createRandomUser());
    });

    beforeEach(async () => {
      ({ team } = await createRandomTeam({ createdBy: userId, organizationId: mockOrganizationId }));

      await Promise.all([
        createTeamUserRelationship({ userId, teamId: team.id, role: Role.Admin }),
        createTeamUserRelationship({ userId: otherUser.id, teamId: team.id, role: Role.User }),
      ]);
    });

    it("returns a valid response", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.delete(`${baseUrl}/teams/${team.id}/users/${otherUser.id}`, { headers });

        expect(status).toBe(200);
        expect(data).toEqual({ message: "User removed from team." });
      } catch (error) {
        fail(error);
      }
    });

    it("deletes the necessary TeamUserRelationship entity", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        await axios.delete(`${baseUrl}/teams/${team.id}/users/${otherUser.id}`, { headers });

        const { teamUserRelationship } = await getTeamUserRelationship({ teamId: team.id, userId: otherUser.id });

        expect(teamUserRelationship).not.toBeDefined();
      } catch (error) {
        fail(error);
      }
    });

    it("publishes a valid SNS message", async () => {
      // clear the sns events table so the tests can have a clean slate
      await deleteSnsEventsByTopicArn({ topicArn: userRemovedFromTeamSnsTopicArn });

      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        await axios.delete(`${baseUrl}/teams/${team.id}/users/${otherUser.id}`, { headers });

        // wait the event has been fired
        const { snsEvents } = await backoff(
          () => getSnsEventsByTopicArn<UserRemovedFromTeamSnsMessage>({ topicArn: userRemovedFromTeamSnsTopicArn }),
          (response) => response.snsEvents.length === 1,
        );

        expect(snsEvents.length).toBe(1);

        expect(snsEvents[0]).toEqual(jasmine.objectContaining({
          message: {
            teamMemberIds: jasmine.arrayContaining([ userId ]),
            team: {
              createdBy: userId,
              id: team.id,
              image: jasmine.stringMatching(URL_REGEX),
              name: team.name,
              organizationId: mockOrganizationId,
            },
            user: {
              email: otherUser.email,
              id: otherUser.id,
              phone: otherUser.phone,
              username: otherUser.username,
              name: otherUser.name,
              bio: otherUser.bio,
              image: jasmine.stringMatching(URL_REGEX),
            },
          },
        }));
      } catch (error) {
        fail(error);
      }
    });
  });

  describe("under error conditions", () => {
    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const headers = {};

        try {
          await axios.delete(`${baseUrl}/teams/${mockTeamId}/users/${mockUserId}`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an id of a team the user is not an admin of is passed in", () => {
      let teamTwo: RawTeam;
      const mockUserIdTwo: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;
      const mockOrganizationId: OrganizationId = `${KeyPrefix.Organization}${generateRandomString()}`;

      beforeEach(async () => {
        ({ team: teamTwo } = await createRandomTeam({ createdBy: mockUserIdTwo, organizationId: mockOrganizationId }));

        await createTeamUserRelationship({ userId, teamId: teamTwo.id, role: Role.User });
      });

      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.delete(`${baseUrl}/teams/${teamTwo.id}/users/${mockUserId}`, { headers });

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
          await axios.delete(`${baseUrl}/teams/invalid-id/users/invalid-id-two`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: {
                teamId: "Failed constraint check for string: Must be a team id",
                userId: "Failed constraint check for string: Must be a user id",
              },
            },
          });
        }
      });
    });
  });
});
