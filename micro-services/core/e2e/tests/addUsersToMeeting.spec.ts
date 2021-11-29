/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Role, UserAddedToMeetingSnsMessage } from "@yac/util";
import axios from "axios";
import { Static } from "runtypes";
import { backoff, generateRandomString, ISO_DATE_REGEX, URL_REGEX } from "../../../../e2e/util";
import { AddUsersToMeetingDto } from "../../src/dtos/addUsersToMeeting.dto";
import { ConversationType } from "../../src/enums/conversationType.enum";
import { EntityType } from "../../src/enums/entityType.enum";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { MeetingConversation, RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { UserId } from "../../src/types/userId.type";
import {
  createConversationUserRelationship,
  createMeetingConversation,
  createRandomUser,
  CreateRandomUserOutput,
  deleteSnsEventsByTopicArn,
  generateRandomEmail,
  generateRandomPhone,
  getConversationUserRelationship,
  getSnsEventsByTopicArn,
} from "../util";

describe("POST /meetings/{meetingId}/users (Add Users to Meeting)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;
  const userAddedToMeetingSnsTopicArn = process.env["user-added-to-meeting-sns-topic-arn"] as string;

  const mockMeetingId = `${KeyPrefix.MeetingConversation}${generateRandomString(5)}`;

  describe("under normal conditions", () => {
    let otherUser: CreateRandomUserOutput["user"];
    let meeting: RawConversation<MeetingConversation>;
    let randomEmail: string;
    let randomPhone: string;
    let randomUsername: string;

    beforeEach(async () => {
      randomEmail = generateRandomEmail();
      randomPhone = generateRandomPhone();
      randomUsername = generateRandomString(8);

      ([ { user: otherUser }, { conversation: meeting } ] = await Promise.all([
        createRandomUser(),
        createMeetingConversation({ createdBy: userId, name: generateRandomString(5), dueDate: new Date().toISOString() }),
      ]));

      await createConversationUserRelationship({ type: ConversationType.Meeting, conversationId: meeting.id, userId, role: Role.Admin });
    });

    it("returns a valid response", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      const request: Static<typeof AddUsersToMeetingDto> = {
        pathParameters: { meetingId: meeting.id },
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
        const { status, data } = await axios.post(`${baseUrl}/meetings/${request.pathParameters.meetingId}/users`, request.body, { headers });

        expect(status).toBe(200);
        expect(data).toEqual({
          message: "Users added to meeting, but with some failures.",
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

    it("creates valid ConversationUserRelationship entities", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      const request: Static<typeof AddUsersToMeetingDto> = {
        pathParameters: { meetingId: meeting.id },
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
        await axios.post(`${baseUrl}/meetings/${request.pathParameters.meetingId}/users`, request.body, { headers });

        const { conversationUserRelationship: conversationUserRelationshipOtherUser } = await getConversationUserRelationship({ conversationId: meeting.id, userId: otherUser.id });

        expect(conversationUserRelationshipOtherUser).toEqual({
          entityType: EntityType.ConversationUserRelationship,
          pk: meeting.id,
          sk: otherUser.id,
          gsi1pk: otherUser.id,
          gsi1sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)),
          gsi2pk: otherUser.id,
          gsi2sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.MeetingConversation}.*`)),
          gsi3pk: otherUser.id,
          gsi3sk: `${KeyPrefix.Time}${meeting.dueDate}`,
          role: Role.Admin,
          type: ConversationType.Meeting,
          dueDate: meeting.dueDate,
          conversationId: meeting.id,
          userId: otherUser.id,
          updatedAt: jasmine.stringMatching(ISO_DATE_REGEX),
          muted: false,
        });
      } catch (error) {
        fail(error);
      }
    });

    it("publishes valid SNS messages", async () => {
      // wait till the meeting creator's sns event has been fired
      await backoff(
        () => getSnsEventsByTopicArn<UserAddedToMeetingSnsMessage>({ topicArn: userAddedToMeetingSnsTopicArn }),
        ({ snsEvents }) => !!snsEvents.find((snsEvent) => snsEvent.message.user.id === userId && snsEvent.message.meeting.id === meeting.id),
      );

      // clear the sns events table so the test can have a clean slate
      await deleteSnsEventsByTopicArn({ topicArn: userAddedToMeetingSnsTopicArn });

      const headers = { Authorization: `Bearer ${accessToken}` };

      const request: Static<typeof AddUsersToMeetingDto> = {
        pathParameters: { meetingId: meeting.id },
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
        await axios.post(`${baseUrl}/meetings/${request.pathParameters.meetingId}/users`, request.body, { headers });

        // wait till all the events have been fired
        const { snsEvents } = await backoff(
          () => getSnsEventsByTopicArn<UserAddedToMeetingSnsMessage>({ topicArn: userAddedToMeetingSnsTopicArn }),
          (response) => response.snsEvents.length === 1,
        );

        expect(snsEvents.length).toBe(3);

        expect(snsEvents).toEqual(jasmine.arrayContaining([
          jasmine.objectContaining({
            message: {
              meetingMemberIds: jasmine.arrayContaining([ userId ]),
              meeting: {
                createdBy: userId,
                id: meeting.id,
                image: jasmine.stringMatching(URL_REGEX),
                name: meeting.name,
                dueDate: meeting.dueDate,
                createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
                type: ConversationType.Meeting,
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
          await axios.post(`${baseUrl}/meetings/${mockMeetingId}/users`, body, { headers });
          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an id of a meeting that the user is not an admin of is passed in", () => {
      let meetingTwo: RawConversation<MeetingConversation>;
      const mockUserIdTwo: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;

      beforeEach(async () => {
        ({ conversation: meetingTwo } = await createMeetingConversation({ createdBy: mockUserIdTwo, name: generateRandomString(5), dueDate: new Date().toISOString() }));

        await createConversationUserRelationship({ type: ConversationType.Meeting, conversationId: meetingTwo.id, userId, role: Role.User });
      });

      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const request: Static<typeof AddUsersToMeetingDto> = {
          pathParameters: { meetingId: meetingTwo.id },
          body: {
            users: [
              { username: generateRandomString(8), role: Role.Admin },
            ],
          },
        };

        try {
          await axios.post(`${baseUrl}/meetings/${request.pathParameters.meetingId}/users`, request.body, { headers });

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
          await axios.post(`${baseUrl}/meetings/pants/users`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { meetingId: "Failed constraint check for string: Must be a meeting id" },
              body: { users: 'Expected ({ email: string; role: "super_admin" | "admin" | "user"; } | { phone: string; role: "super_admin" | "admin" | "user"; } | { username: string; role: "super_admin" | "admin" | "user"; })[], but was missing' },
            },
          });
        }
      });
    });
  });
});
