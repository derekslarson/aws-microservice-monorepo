/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { Role } from "@yac/util";
import { Static } from "runtypes";
import { RawTeam } from "../../src/repositories/team.dynamo.repository";
import { createRandomUser, createRandomTeam, createTeamUserRelationship, getTeamUserRelationship, CreateRandomUserOutput, generateRandomEmail, generateRandomPhone, getUserByEmail, getUserByPhone, getUniqueProperty } from "../util";
import { UserId } from "../../src/types/userId.type";
import { generateRandomString, URL_REGEX } from "../../../../e2e/util";
import { EntityType } from "../../src/enums/entityType.enum";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { AddUsersToTeamDto } from "../../src/dtos/addUsersToTeam.dto";
import { ImageMimeType } from "../../src/enums/image.mimeType.enum";
import { UniqueProperty } from "../../src/enums/uniqueProperty.enum";

describe("POST /teams/{teamId}/users (Add Users to Team)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;

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
            {
              id: jasmine.stringMatching(new RegExp(`${KeyPrefix.User}.*`)),
              username: otherUser.username,
              realName: otherUser.realName,
              email: otherUser.email,
              phone: otherUser.phone,
              image: jasmine.stringMatching(URL_REGEX),
            },
            {
              id: jasmine.stringMatching(new RegExp(`${KeyPrefix.User}.*`)),
              email: randomEmail,
              image: jasmine.stringMatching(URL_REGEX),
            },
            {
              id: jasmine.stringMatching(new RegExp(`${KeyPrefix.User}.*`)),
              phone: randomPhone,
              image: jasmine.stringMatching(URL_REGEX),
            },
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

        const [ { user: userByEmail }, { user: userByPhone } ] = await Promise.all([
          getUserByEmail({ email: randomEmail }),
          getUserByPhone({ phone: randomPhone }),
        ]);

        expect(userByEmail).toEqual({
          entityType: EntityType.User,
          pk: jasmine.stringMatching(new RegExp(`${KeyPrefix.User}.*`)),
          sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.User}.*`)),
          id: jasmine.stringMatching(new RegExp(`${KeyPrefix.User}.*`)),
          email: randomEmail,
          imageMimeType: ImageMimeType.Png,
        });

        expect(userByPhone).toEqual({
          entityType: EntityType.User,
          pk: jasmine.stringMatching(new RegExp(`${KeyPrefix.User}.*`)),
          sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.User}.*`)),
          id: jasmine.stringMatching(new RegExp(`${KeyPrefix.User}.*`)),
          phone: randomPhone,
          imageMimeType: ImageMimeType.Png,
        });
      } catch (error) {
        fail(error);
      }
    });

    it("creates valid UniqueProperty entities", async () => {
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

        const [ { user: userByEmail }, { user: userByPhone } ] = await Promise.all([
          getUserByEmail({ email: randomEmail }),
          getUserByPhone({ phone: randomPhone }),
        ]);

        if (!userByEmail || !userByPhone) {
          throw new Error("necessary user records not created");
        }

        const [ { uniqueProperty: uniqueEmail }, { uniqueProperty: uniquePhone } ] = await Promise.all([
          getUniqueProperty({ property: UniqueProperty.Email, value: randomEmail }),
          getUniqueProperty({ property: UniqueProperty.Phone, value: randomPhone }),
        ]);

        expect(uniqueEmail).toEqual({
          entityType: EntityType.UniqueProperty,
          pk: UniqueProperty.Email,
          sk: randomEmail,
          property: UniqueProperty.Email,
          value: randomEmail,
          userId: userByEmail.id,
        });

        expect(uniquePhone).toEqual({
          entityType: EntityType.UniqueProperty,
          pk: UniqueProperty.Phone,
          sk: randomPhone,
          property: UniqueProperty.Phone,
          value: randomPhone,
          userId: userByPhone.id,
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

        const [ { user: userByEmail }, { user: userByPhone } ] = await Promise.all([
          getUserByEmail({ email: randomEmail }),
          getUserByPhone({ phone: randomPhone }),
        ]);

        if (!userByEmail || !userByPhone) {
          throw new Error("necessary user records not created");
        }

        const [
          { teamUserRelationship: teamUserRelationshipOtherUser },
          { teamUserRelationship: teamUserRelationshipUserByEmail },
          { teamUserRelationship: teamUserRelationshipUserByPhone },
        ] = await Promise.all([
          getTeamUserRelationship({ teamId: team.id, userId: otherUser.id }),
          getTeamUserRelationship({ teamId: team.id, userId: userByEmail.id }),
          getTeamUserRelationship({ teamId: team.id, userId: userByPhone.id }),
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

        expect(teamUserRelationshipUserByEmail).toEqual({
          entityType: EntityType.TeamUserRelationship,
          pk: team.id,
          sk: userByEmail.id,
          gsi1pk: userByEmail.id,
          gsi1sk: team.id,
          role: Role.User,
          teamId: team.id,
          userId: userByEmail.id,
        });

        expect(teamUserRelationshipUserByPhone).toEqual({
          entityType: EntityType.TeamUserRelationship,
          pk: team.id,
          sk: userByPhone.id,
          gsi1pk: userByPhone.id,
          gsi1sk: team.id,
          role: Role.Admin,
          teamId: team.id,
          userId: userByPhone.id,
        });
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
        } catch (error) {
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
        } catch (error) {
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
        } catch (error) {
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
