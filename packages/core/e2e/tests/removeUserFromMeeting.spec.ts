/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { OrganizationId, Role, UserRemovedFromMeetingSnsMessage } from "@yac/util";
import { createRandomUser, createConversationUserRelationship, createMeeting, getConversationUserRelationship, CreateRandomUserOutput, deleteSnsEventsByTopicArn, getSnsEventsByTopicArn } from "../util";
import { UserId } from "../../src/types/userId.type";
import { backoff, generateRandomString, ISO_DATE_REGEX, URL_REGEX } from "../../../../e2e/util";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { Meeting, RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { MeetingId } from "../../src/types/meetingId.type";
import { ConversationType } from "../../src/enums/conversationType.enum";

describe("DELETE /meetings/{meetingId}/users/{userId} (Remove User from Meeting)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;
  const userRemovedFromMeetingSnsTopicArn = process.env["user-removed-from-meeting-sns-topic-arn"] as string;

  const mockUserId: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;
  const mockMeetingId: MeetingId = `${KeyPrefix.Meeting}${generateRandomString(5)}`;
  const mockOrganizationId: OrganizationId = `${KeyPrefix.Organization}${generateRandomString()}`;

  describe("under normal conditions", () => {
    let meeting: RawConversation<Meeting>;
    let otherUser: CreateRandomUserOutput["user"];

    beforeAll(async () => {
      ({ user: otherUser } = await createRandomUser());
    });

    beforeEach(async () => {
      ({ conversation: meeting } = await createMeeting({ createdBy: userId, organizationId: mockOrganizationId, name: generateRandomString(5), dueDate: new Date().toISOString() }));

      await Promise.all([
        createConversationUserRelationship({ type: ConversationType.Meeting, userId, conversationId: meeting.id, role: Role.Admin }),
        createConversationUserRelationship({ type: ConversationType.Meeting, userId: otherUser.id, conversationId: meeting.id, role: Role.User }),
      ]);
    });

    it("returns a valid response", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.delete(`${baseUrl}/meetings/${meeting.id}/users/${otherUser.id}`, { headers });

        expect(status).toBe(200);
        expect(data).toEqual({ message: "User removed from meeting." });
      } catch (error) {
        fail(error);
      }
    });

    it("deletes the necessary ConversationUserRelationship entity", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        await axios.delete(`${baseUrl}/meetings/${meeting.id}/users/${otherUser.id}`, { headers });

        const { conversationUserRelationship } = await getConversationUserRelationship({ conversationId: meeting.id, userId: otherUser.id });

        expect(conversationUserRelationship).not.toBeDefined();
      } catch (error) {
        fail(error);
      }
    });

    it("publishes a valid SNS message", async () => {
      // clear the sns events table so the test can have a clean slate
      await deleteSnsEventsByTopicArn({ topicArn: userRemovedFromMeetingSnsTopicArn });

      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        await axios.delete(`${baseUrl}/meetings/${meeting.id}/users/${otherUser.id}`, { headers });

        // wait the event has been fired
        const { snsEvents } = await backoff(
          () => getSnsEventsByTopicArn<UserRemovedFromMeetingSnsMessage>({ topicArn: userRemovedFromMeetingSnsTopicArn }),
          (response) => response.snsEvents.length === 1,
        );

        expect(snsEvents.length).toBe(1);

        expect(snsEvents[0]).toEqual(jasmine.objectContaining({
          message: {
            meetingMemberIds: jasmine.arrayContaining([ userId ]),
            meeting: {
              createdBy: userId,
              id: meeting.id,
              organizationId: mockOrganizationId,
              image: jasmine.stringMatching(URL_REGEX),
              name: meeting.name,
              dueDate: meeting.dueDate,
              type: meeting.type,
              createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
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
          await axios.delete(`${baseUrl}/meetings/${mockMeetingId}/users/${mockUserId}`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an id of a meeting the user is not an admin of is passed in", () => {
      let meetingTwo: RawConversation<Meeting>;
      const mockUserIdTwo: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;

      beforeEach(async () => {
        ({ conversation: meetingTwo } = await createMeeting({ createdBy: mockUserIdTwo, organizationId: mockOrganizationId, name: generateRandomString(5), dueDate: new Date().toISOString() }));

        await createConversationUserRelationship({ type: ConversationType.Meeting, userId, conversationId: meetingTwo.id, role: Role.User });
      });

      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.delete(`${baseUrl}/meetings/${meetingTwo.id}/users/${mockUserId}`, { headers });

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
          await axios.delete(`${baseUrl}/meetings/invalid-id/users/invalid-id-two`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: {
                meetingId: "Failed constraint check for string: Must be a meeting id",
                userId: "Failed constraint check for string: Must be a user id",
              },
            },
          });
        }
      });
    });
  });
});
