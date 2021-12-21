/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import axios from "axios";
import { createRandomAuthServiceUser, generateRandomString, getAccessTokenByEmail } from "../../../../e2e/util";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { getUser } from "../util";
import { UserId } from "../../src/types/userId.type";

describe("PATCH /users/{userId} (Update User)", () => {
  const baseUrl = process.env.baseUrl as string;
  let userId: UserId;
  let accessToken: string;

  beforeEach(async () => {
    // We have to fetch a new base user and access token here to prevent bleed over to other tests
    const user = await createRandomAuthServiceUser();
    userId = user.id;

    ({ accessToken } = await getAccessTokenByEmail(user.email));
  });

  describe("under normal conditions", () => {
    describe("when passed both 'bio' and 'name' value", () => {
      const body = { bio: generateRandomString(5), name: generateRandomString(5) };

      it("returns a valid response", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.patch(`${baseUrl}/users/${userId}`, body, { headers });

          expect(status).toBe(200);
          expect(data).toEqual({ message: "User updated." });
        } catch (error) {
          fail(error);
        }
      });

      it("updates the User entity", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.patch(`${baseUrl}/users/${userId}`, body, { headers });

          const { user: userEntity } = await getUser({ userId });

          if (!userEntity) {
            throw new Error("user entity not found");
          }

          expect(userEntity).toEqual({
            ...userEntity,
            ...body,
          });
        } catch (error) {
          fail(error);
        }
      });
    });
  });

  describe("under error conditions", () => {
    const mockUserId = `${KeyPrefix.User}${generateRandomString(5)}`;

    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const headers = {};
        const body = { name: generateRandomString(5), bio: generateRandomString(5) };

        try {
          await axios.patch(`${baseUrl}/users/${userId}`, body, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an id of a user other than the one in the auth token is passed in", () => {
      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const body = { name: generateRandomString(5), bio: generateRandomString(5) };

        try {
          await axios.patch(`${baseUrl}/users/${mockUserId}`, body, { headers });

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
        const body = { name: false, bio: true };

        try {
          await axios.patch(`${baseUrl}/users/test`, body, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { userId: "Failed constraint check for string: Must be a user id" },
              body: { name: "Expected string, but was boolean", bio: "Expected string, but was boolean" },
            },
          });
        }
      });
    });
  });
});
