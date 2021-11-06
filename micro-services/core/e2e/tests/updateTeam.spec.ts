/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import axios from "axios";
import { generateRandomString, getAccessToken } from "../../../../e2e/util";
import { createRandomTeam, CreateRandomTeamOutput, createRandomUser, getTeam } from "../util";
import { UserId } from "../../src/types/userId.type";

describe("PATCH /teams/{team.id} (Update User by User Id)", () => {
  const baseUrl = process.env.baseUrl as string;

  const userId = process.env.userId as UserId;
  let team: CreateRandomTeamOutput["team"];
  const accessToken = process.env.accessToken as string;

  describe("under normal conditions", () => {
    beforeEach(async () => {
      ({ team } = await createRandomTeam({ createdBy: userId }));
    });

    describe("when passed both 'name' value", () => {
      const body = { name: generateRandomString(5) };

      it("returns a valid response", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.patch(`${baseUrl}/teams/${team.id}`, body, { headers });

          expect(status).toBe(200);
          expect(data).toEqual({ message: "User updated." });
        } catch (error) {
          fail(error);
        }
      });

      it("updates the Team entity", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.patch(`${baseUrl}/teams/${team.id}`, body, { headers });

          const { team: teamEntity } = await getTeam({ teamId: team.id });

          expect(teamEntity).toEqual({
            ...teamEntity,
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
        const body = { realName: generateRandomString(5), bio: generateRandomString(5) };

        try {
          await axios.patch(`${baseUrl}/teams/${team.id}`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an access token from a user who is not admin from the team is passed in", () => {
      it("throws a 403 error", async () => {
        const { user: randomUser } = await createRandomUser();
        const { accessToken: wrongAccessToken } = await getAccessToken(randomUser.id);
        const headers = { Authorization: `Bearer ${wrongAccessToken}` };
        const body = { name: generateRandomString(5) };

        try {
          await axios.patch(`${baseUrl}/teams/${team.id}`, body, { headers });

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
        const body = { name: false };

        try {
          await axios.patch(`${baseUrl}/teams/test`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { userId: "Failed constraint check for string: Must be a team id" },
              body: { name: "Expected string, but was boolean" },
            },
          });
        }
      });
    });
  });
});
