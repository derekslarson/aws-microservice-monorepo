/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { UserId } from "@yac/util";
import axios, { AxiosError } from "axios";
import { createRandomCognitoUser, generateRandomString, getAccessToken } from "../../../../e2e/util";
import { EntityType } from "../../src/enums/entityType.enum";
import { createGoogleSettings, getGoogleSettings } from "../util";

describe("PATCH /users/{userId}/google/settings (Update Google Settings)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;

  describe("under normal conditions", () => {
    it("returns a valid response", async () => {
      const defaultCalendarId = generateRandomString(5);
      const body = { defaultCalendarId };
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.patch(`${baseUrl}/users/${userId}/google/settings`, body, { headers });

        expect(status).toBe(200);
        expect(data).toEqual({ message: "Settings updated." });
      } catch (error) {
        fail(error);
      }
    });

    describe("when a settings entity doesn't already exist", () => {
      let userIdTwo: UserId;
      let accessTokenTwo: string;

      beforeEach(async () => {
        ({ id: userIdTwo } = await createRandomCognitoUser());
        ({ accessToken: accessTokenTwo } = await getAccessToken(userIdTwo));
      });

      it("creates a valid Google Settings entity", async () => {
        const defaultCalendarId = generateRandomString(5);
        const body = { defaultCalendarId };
        const headers = { Authorization: `Bearer ${accessTokenTwo}` };

        try {
          await axios.patch(`${baseUrl}/users/${userIdTwo}/google/settings`, body, { headers });

          const { googleSettings } = await getGoogleSettings({ userId: userIdTwo });

          expect(googleSettings).toEqual({
            entityType: EntityType.GoogleSettings,
            pk: userIdTwo,
            sk: EntityType.GoogleSettings,
            userId: userIdTwo,
            defaultCalendarId,
          });
        } catch (error) {
          fail(error);
        }
      });
    });

    describe("when a settings entity already exists", () => {
      let userIdTwo: UserId;
      let accessTokenTwo: string;

      beforeEach(async () => {
        ({ id: userIdTwo } = await createRandomCognitoUser());
        ([ { accessToken: accessTokenTwo } ] = await Promise.all([
          getAccessToken(userIdTwo),
          createGoogleSettings({ userId: userIdTwo, defaultCalendarId: generateRandomString(5) }),
        ]));
      });

      it("updates the existing Google Settings entity", async () => {
        const defaultCalendarId = generateRandomString(5);
        const body = { defaultCalendarId };
        const headers = { Authorization: `Bearer ${accessTokenTwo}` };

        try {
          await axios.patch(`${baseUrl}/users/${userIdTwo}/google/settings`, body, { headers });

          const { googleSettings } = await getGoogleSettings({ userId: userIdTwo });

          expect(googleSettings).toEqual({
            entityType: EntityType.GoogleSettings,
            pk: userIdTwo,
            sk: EntityType.GoogleSettings,
            userId: userIdTwo,
            defaultCalendarId,
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
        const defaultCalendarId = generateRandomString(5);
        const body = { defaultCalendarId };
        const headers = { };

        try {
          await axios.patch(`${baseUrl}/users/${userId}/google/settings`, body, { headers });

          fail("Expected an error");
        } catch (err) {
          const error = err as AxiosError;

          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when passed invalid parameters", () => {
      it("throws a 400 error with a valid structure", async () => {
        const body = { defaultCalendarId: true };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.patch(`${baseUrl}/users/pants/google/settings`, body, { headers });

          fail("Expected an error");
        } catch (err) {
          const error = err as AxiosError;

          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { userId: "Failed constraint check for string: Must be a user id" },
              body: { defaultCalendarId: "Expected string, but was boolean" },
            },
          });
        }
      });
    });
  });
});
