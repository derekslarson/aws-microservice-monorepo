/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { Role, UserAddedToTeamSnsMessage } from "@yac/util";
import { Static } from "runtypes";
import { RawTeam } from "../../src/repositories/team.dynamo.repository";
import {
  createRandomUser,
  createRandomTeam,
  createTeamUserRelationship,
  getTeamUserRelationship,
  CreateRandomUserOutput,
  generateRandomEmail,
  generateRandomPhone,
  deleteSnsEventsByTopicArn,
  getSnsEventsByTopicArn,
  getUserByEmail,
  getUserByPhone,
} from "../util";
import { UserId } from "../../src/types/userId.type";
import { backoff, generateRandomString, URL_REGEX } from "../../../../e2e/util";
import { EntityType } from "../../src/enums/entityType.enum";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { AddUsersToTeamDto } from "../../src/dtos/addUsersToTeam.dto";
import { ImageMimeType } from "../../src/enums/image.mimeType.enum";

describe("POST /teams/{teamId}/users (Add Users to Team)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;
  const userAddedToTeamSnsTopicArn = process.env["user-added-to-team-sns-topic-arn"] as string;

  const mockTeamId = `${KeyPrefix.Team}${generateRandomString(5)}`;

  describe("under normal conditions", () => {
    let team: RawTeam;
    let otherUser: CreateRandomUserOutput["user"];
    let randomEmail: string;
    let randomPhone: string;
    let randomUsername: string;

    beforeEach(async () => {
      randomEmail = generateRandomEmail();
      randomPhone = generateRandomPhone();
      randomUsername = generateRandomString(8);

      ([ { user: otherUser }, { team } ] = await Promise.all([
        createRandomUser(),
        createRandomTeam({ createdBy: userId }),
      ]));

      await createTeamUserRelationship({ userId, teamId: team.id, role: Role.Admin });
    });

    it("returns a valid response", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      const request: Static<typeof AddUsersToTeamDto> = {
        pathParameters: { teamId: team.id },
        body: {
          users: [
            { username: otherUser.username, role: Role.Admin },
            { email: randomEmail, role: Role.User },
            { phone: randomPhone, role: Role.Admin },
            { username: randomUsername, role: Role.User },
          ],
        },
      };

      try {
        const { status, data } = await axios.post(`${baseUrl}/teams/${request.pathParameters.teamId}/users`, request.body, { headers });

        expect(status).toBe(200);
        expect(data).toEqual({
          message: "Users added to team, but with some failures.",
          successes: jasmine.arrayContaining([
            { username: otherUser.username, role: Role.Admin },
            { email: randomEmail, role: Role.User },
            { phone: randomPhone, role: Role.Admin },
          ]),
          failures: [
            { username: randomUsername, role: Role.User },
          ],
        });
      } catch (error) {
        fail(error);
      }
    });

    it("creates valid User entities", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      const request: Static<typeof AddUsersToTeamDto> = {
        pathParameters: { teamId: team.id },
        body: {
          users: [
            { username: otherUser.username, role: Role.Admin },
            { email: randomEmail, role: Role.User },
            { phone: randomPhone, role: Role.Admin },
            { username: randomUsername, role: Role.User },
          ],
        },
      };

      try {
        await axios.post(`${baseUrl}/teams/${request.pathParameters.teamId}/users`, request.body, { headers });

        const [ { user: emailUser }, { user: phoneUser } ] = await Promise.all([
          backoff(() => getUserByEmail({ email: randomEmail }), (res) => !!res.user),
          backoff(() => getUserByPhone({ phone: randomPhone }), (res) => !!res.user),
        ]);

        if (!emailUser || !phoneUser) {
          throw new Error("Necessary user entities not created.");
        }

        expect(emailUser).toEqual({
          entityType: EntityType.User,
          pk: emailUser.id,
          sk: EntityType.User,
          id: emailUser.id,
          gsi1pk: emailUser.email,
          gsi1sk: EntityType.User,
          imageMimeType: ImageMimeType.Png,
          email: emailUser.email,
        });

        expect(phoneUser).toEqual({
          entityType: EntityType.User,
          pk: phoneUser.id,
          sk: EntityType.User,
          id: phoneUser.id,
          gsi2pk: phoneUser.phone,
          gsi2sk: EntityType.User,
          imageMimeType: ImageMimeType.Png,
          phone: phoneUser.phone,
        });
      } catch (error) {
        fail(error);
      }
    });

    it("creates valid TeamUserRelationship entities", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      const request: Static<typeof AddUsersToTeamDto> = {
        pathParameters: { teamId: team.id },
        body: {
          users: [
            { username: otherUser.username, role: Role.Admin },
            { email: randomEmail, role: Role.User },
            { phone: randomPhone, role: Role.Admin },
            { username: randomUsername, role: Role.User },
          ],
        },
      };

      try {
        await axios.post(`${baseUrl}/teams/${request.pathParameters.teamId}/users`, request.body, { headers });

        const [ { user: emailUser }, { user: phoneUser } ] = await Promise.all([
          backoff(() => getUserByEmail({ email: randomEmail }), (res) => !!res.user),
          backoff(() => getUserByPhone({ phone: randomPhone }), (res) => !!res.user),
        ]);

        if (!emailUser || !phoneUser) {
          throw new Error("Necessary user entities not created.");
        }

        const [
          { teamUserRelationship: teamUserRelationshipOtherUser },
          { teamUserRelationship: teamUserRelationshipEmailUser },
          { teamUserRelationship: teamUserRelationshipPhoneUser },
        ] = await Promise.all([
          backoff(() => getTeamUserRelationship({ teamId: team.id, userId: otherUser.id }), (res) => !!res.teamUserRelationship),
          backoff(() => getTeamUserRelationship({ teamId: team.id, userId: emailUser.id }), (res) => !!res.teamUserRelationship),
          backoff(() => getTeamUserRelationship({ teamId: team.id, userId: phoneUser.id }), (res) => !!res.teamUserRelationship),
        ]);

        expect(teamUserRelationshipOtherUser).toEqual({
          entityType: EntityType.TeamUserRelationship,
          pk: team.id,
          sk: otherUser.id,
          gsi1pk: otherUser.id,
          gsi1sk: team.id,
          role: Role.Admin,
          teamId: team.id,
          userId: otherUser.id,
        });

        expect(teamUserRelationshipEmailUser).toEqual({
          entityType: EntityType.TeamUserRelationship,
          pk: team.id,
          sk: emailUser.id,
          gsi1pk: emailUser.id,
          gsi1sk: team.id,
          role: Role.User,
          teamId: team.id,
          userId: emailUser.id,
        });

        expect(teamUserRelationshipPhoneUser).toEqual({
          entityType: EntityType.TeamUserRelationship,
          pk: team.id,
          sk: phoneUser.id,
          gsi1pk: phoneUser.id,
          gsi1sk: team.id,
          role: Role.Admin,
          teamId: team.id,
          userId: phoneUser.id,
        });
      } catch (error) {
        fail(error);
      }
    });

    it("publishes valid SNS messages", async () => {
      // wait till the team creator's sns event has been fired
      await backoff(
        () => getSnsEventsByTopicArn<UserAddedToTeamSnsMessage>({ topicArn: userAddedToTeamSnsTopicArn }),
        ({ snsEvents }) => !!snsEvents.find((snsEvent) => snsEvent.message.user.id === userId && snsEvent.message.team.id === team.id),
      );

      // clear the sns events table so the test can have a clean slate
      await deleteSnsEventsByTopicArn({ topicArn: userAddedToTeamSnsTopicArn });

      const headers = { Authorization: `Bearer ${accessToken}` };

      const request: Static<typeof AddUsersToTeamDto> = {
        pathParameters: { teamId: team.id },
        body: {
          users: [
            { username: otherUser.username, role: Role.Admin },
            { email: randomEmail, role: Role.User },
            { phone: randomPhone, role: Role.Admin },
            { username: randomUsername, role: Role.User },
          ],
        },
      };

      try {
        await axios.post(`${baseUrl}/teams/${request.pathParameters.teamId}/users`, request.body, { headers });

        const [ { user: emailUser }, { user: phoneUser } ] = await Promise.all([
          backoff(() => getUserByEmail({ email: randomEmail }), (res) => !!res.user),
          backoff(() => getUserByPhone({ phone: randomPhone }), (res) => !!res.user),
        ]);

        if (!emailUser || !phoneUser) {
          throw new Error("Necessary user entities not created.");
        }

        // wait till all the events have been fired
        const { snsEvents } = await backoff(
          () => getSnsEventsByTopicArn<UserAddedToTeamSnsMessage>({ topicArn: userAddedToTeamSnsTopicArn }),
          (response) => response.snsEvents.length === 3,
        );

        expect(snsEvents.length).toBe(3);

        expect(snsEvents).toEqual(jasmine.arrayContaining([
          jasmine.objectContaining({
            message: {
              teamMemberIds: jasmine.arrayContaining([ userId ]),
              team: {
                createdBy: userId,
                id: team.id,
                image: jasmine.stringMatching(URL_REGEX),
                name: team.name,
              },
              user: {
                email: otherUser.email,
                phone: otherUser.phone,
                username: otherUser.username,
                name: otherUser.name,
                bio: otherUser.bio,
                id: otherUser.id,
                image: jasmine.stringMatching(URL_REGEX),
              },
            },
          }),
          jasmine.objectContaining({
            message: {
              teamMemberIds: jasmine.arrayContaining([ userId ]),
              team: {
                createdBy: userId,
                id: team.id,
                image: jasmine.stringMatching(URL_REGEX),
                name: team.name,
              },
              user: {
                email: emailUser.email,
                id: emailUser.id,
                image: jasmine.stringMatching(URL_REGEX),
              },
            },
          }),
          jasmine.objectContaining({
            message: {
              teamMemberIds: jasmine.arrayContaining([ userId ]),
              team: {
                createdBy: userId,
                id: team.id,
                image: jasmine.stringMatching(URL_REGEX),
                name: team.name,
              },
              user: {
                phone: phoneUser.phone,
                id: phoneUser.id,
                image: jasmine.stringMatching(URL_REGEX),
              },
            },
          }),
        ]));
      } catch (error) {
        fail(error);
      }
    });
  });

  describe("under error conditions", () => {
    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const body = {};
        const headers = { };

        try {
          await axios.post(`${baseUrl}/teams/${mockTeamId}/users`, body, { headers });
          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an id of a team that the user is not an admin of is passed in", () => {
      let teamTwo: RawTeam;
      const mockUserIdTwo: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;

      beforeEach(async () => {
        ({ team: teamTwo } = await createRandomTeam({ createdBy: mockUserIdTwo }));

        await createTeamUserRelationship({ teamId: teamTwo.id, userId, role: Role.User });
      });

      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const request: Static<typeof AddUsersToTeamDto> = {
          pathParameters: { teamId: teamTwo.id },
          body: {
            users: [
              { username: generateRandomString(8), role: Role.Admin },
            ],
          },
        };

        try {
          await axios.post(`${baseUrl}/teams/${request.pathParameters.teamId}/users`, request.body, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(403);
          expect(error.response?.statusText).toBe("Forbidden");
        }
      });
    });

    describe("when passed invalid parameters", () => {
      it("throws a 400 error with a valid structure", async () => {
        const body = {};
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.post(`${baseUrl}/teams/pants/users`, body, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { teamId: "Failed constraint check for string: Must be a team id" },
              body: { users: 'Expected ({ email: string; role: "super_admin" | "admin" | "user"; } | { phone: string; role: "super_admin" | "admin" | "user"; } | { username: string; role: "super_admin" | "admin" | "user"; })[], but was missing' },
            },
          });
        }
      });
    });
  });
});
