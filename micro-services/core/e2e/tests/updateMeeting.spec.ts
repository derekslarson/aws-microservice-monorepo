/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import axios from "axios";
import { generateRandomString, getAccessToken } from "../../../../e2e/util";
import { createMeetingConversation, createRandomUser, getConversation } from "../util";
import { UserId } from "../../src/types/userId.type";
import { MeetingConversation } from "../../src/repositories/conversation.dynamo.repository";

describe("PATCH /meetings/{meetingId} (Update Meeting)", () => {
  const baseUrl = process.env.baseUrl as string;

  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;

  let meeting: MeetingConversation;
  beforeEach(async () => {
    ({ conversation: meeting } = await createMeetingConversation({ createdBy: userId, name: generateRandomString(5), dueDate: new Date().toISOString() }));
  });

  describe("under normal conditions", () => {
    describe("when passed both 'name' and 'outcomes' value", () => {
      const body = { name: generateRandomString(5), outcomes: generateRandomString(5) };

      it("returns a valid response", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.patch(`${baseUrl}/meetings/${meeting.id}`, body, { headers });

          expect(status).toBe(200);
          expect(data).toEqual({ meeting: "Meeting updated." });
        } catch (error) {
          fail(error);
        }
      });

      it("updates the Meeting entity", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.patch(`${baseUrl}/meetings/${meeting.id}`, body, { headers });

          const { conversation: meetingEntity } = await getConversation({ conversationId: meeting.id });

          if (!meetingEntity) {
            throw new Error("meeting entity not found");
          }

          expect(meetingEntity).toEqual({
            ...meetingEntity,
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
        const body = { name: generateRandomString(5), outcomes: generateRandomString(5) };

        try {
          await axios.patch(`${baseUrl}/meetings/${meeting.id}`, body, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an access token from a user other than the meeting admin is passed in", () => {
      it("throws a 403 error", async () => {
        const { user: randomUser } = await createRandomUser();
        const { accessToken: wrongAccessToken } = await getAccessToken(randomUser.id);
        const headers = { Authorization: `Bearer ${wrongAccessToken}` };
        const body = { name: generateRandomString(5), outcomes: generateRandomString(5) };

        try {
          await axios.patch(`${baseUrl}/meetings/${meeting.id}`, body, { headers });

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
        const body = { name: false, outcomes: true };

        try {
          await axios.patch(`${baseUrl}/meetings/test`, body, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { meetingId: "Failed constraint check for string: Must be a meeting id" },
              body: {
                name: "Expected string, but was boolean",
                outcomes: "Expected string, but was boolean",
              },
            },
          });
        }
      });
    });
  });
});
