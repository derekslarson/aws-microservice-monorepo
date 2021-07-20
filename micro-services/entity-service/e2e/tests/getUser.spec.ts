/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { UserId } from "../../src/types/userId.type";
import { User } from "../../src/mediator-services/user.mediator.service";

describe("GET /users/{userId} (Get User)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const userEmail = process.env.userEmail as string;
  const accessToken = process.env.accessToken as string;

  describe("under normal conditions", () => {
    fit("returns a valid response", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.get<{ user: User; }>(`${baseUrl}/users/${userId}`, { headers });

        expect(status).toBe(200);
        expect(data).toEqual({
          user: {
            id: userId,
            email: userEmail,
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
          await axios.get(`${baseUrl}/users/${userId}`, { headers });

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
