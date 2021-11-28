/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { getAccessTokenByEmail, URL_REGEX } from "../../../../e2e/util";
import { createRandomUser, CreateRandomUserOutput } from "../util";

describe("GET /users/{userId} (Get User)", () => {
  const baseUrl = process.env.baseUrl as string;

  let user: CreateRandomUserOutput["user"];
  let accessToken: string;

  beforeAll(async () => {
    ({ user } = await createRandomUser());

    ({ accessToken } = await getAccessTokenByEmail(user.email));
  });

  describe("under normal conditions", () => {
    it("returns a valid response", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.get(`${baseUrl}/users/${user.id}`, { headers });

        expect(status).toBe(200);
        expect(data).toEqual({
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            phone: user.phone,
            name: user.name,
            bio: user.bio,
            image: jasmine.stringMatching(URL_REGEX),
          },
        });
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
          await axios.get(`${baseUrl}/users/${user.id}`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when passed invalid parameters", () => {
      it("throws a 400 error with a valid structure", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.get(`${baseUrl}/users/invalid-id`, { headers });

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
