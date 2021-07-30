/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import axios from "axios";
import { Role } from "@yac/util";
import { createConversationUserRelationship, createMeetingConversation } from "../util";
import { UserId } from "../../src/types/userId.type";
import { MeetingConversation, RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { generateRandomString, URL_REGEX } from "../../../../e2e/util";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { TeamId } from "../../src/types/teamId.type";
import { MeetingId } from "../../src/types/meetingId.type";
import { ConversationType } from "../../src/enums/conversationType.enum";

describe("GET /meetings/{meetingId} (Get Meeting)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;

  const mockTeamId: TeamId = `${KeyPrefix.Team}${generateRandomString(5)}`;

  describe("under normal conditions", () => {
    let meeting: RawConversation<MeetingConversation>;

    beforeAll(async () => {
      ({ conversation: meeting } = await createMeetingConversation({ createdBy: userId, name: generateRandomString(5), dueDate: new Date().toISOString(), teamId: mockTeamId }));

      await createConversationUserRelationship({ type: ConversationType.Meeting, conversationId: meeting.id, userId, role: Role.Admin });
    });

    it("returns a valid response", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.get(`${baseUrl}/meetings/${meeting.id}`, { headers });

        expect(status).toBe(200);
        expect(data).toEqual({
          meeting: {
            id: meeting.id,
            name: meeting.name,
            createdBy: meeting.createdBy,
            createdAt: meeting.createdAt,
            dueDate: meeting.dueDate,
            teamId: meeting.teamId,
            image: jasmine.stringMatching(URL_REGEX),
          },
        });
      } catch (error) {
        fail(error);
      }
    });
  });

  describe("under error conditions", () => {
    const mockUserId: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;
    const mockMeetingId: MeetingId = `${KeyPrefix.MeetingConversation}${generateRandomString(5)}`;

    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const headers = {};

        try {
          await axios.get(`${baseUrl}/meetings/${mockMeetingId}`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when a meetingId of a group the user is not a member of is passed in", () => {
      let meeting: RawConversation<MeetingConversation>;

      beforeAll(async () => {
        ({ conversation: meeting } = await createMeetingConversation({ createdBy: mockUserId, name: generateRandomString(5), dueDate: new Date().toISOString() }));
      });

      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.get(`${baseUrl}/meetings/${meeting.id}`, { headers });

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
          await axios.get(`${baseUrl}/meetings/test`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: { pathParameters: { meetingId: "Failed constraint check for string: Must be a meeting id" } },
          });
        }
      });
    });
  });
});
