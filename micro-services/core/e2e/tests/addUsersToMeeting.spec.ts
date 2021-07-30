/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Role } from "@yac/util";
import axios from "axios";
import { Static } from "runtypes";
import { generateRandomString, ISO_DATE_REGEX, URL_REGEX } from "../../../../e2e/util";
import { AddUsersToMeetingDto } from "../../src/dtos/addUsersToMeeting.dto";
import { ConversationType } from "../../src/enums/conversationType.enum";
import { EntityType } from "../../src/enums/entityType.enum";
import { ImageMimeType } from "../../src/enums/image.mimeType.enum";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { UniqueProperty } from "../../src/enums/uniqueProperty.enum";
import { MeetingConversation, RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { UserId } from "../../src/types/userId.type";
import {
  createConversationUserRelationship,
  createMeetingConversation,
  createRandomUser,
  CreateRandomUserOutput,
  generateRandomEmail,
  generateRandomPhone,
  getConversationUserRelationship,
  getUniqueProperty,
  getUserByEmail,
  getUserByPhone,
} from "../util";

describe("POST /meetings/{meetingId}/users (Add Users to Meeting)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;

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

        const [ { user: userByEmail }, { user: userByPhone } ] = await Promise.all([
          getUserByEmail({ email: randomEmail }),
          getUserByPhone({ phone: randomPhone }),
        ]);

        if (!userByEmail || !userByPhone) {
          throw new Error("necessary user records not created");
        }

        const [
          { conversationUserRelationship: conversationUserRelationshipOtherUser },
          { conversationUserRelationship: conversationUserRelationshipUserByEmail },
          { conversationUserRelationship: conversationUserRelationshipUserByPhone },
        ] = await Promise.all([
          getConversationUserRelationship({ conversationId: meeting.id, userId: otherUser.id }),
          getConversationUserRelationship({ conversationId: meeting.id, userId: userByEmail.id }),
          getConversationUserRelationship({ conversationId: meeting.id, userId: userByPhone.id }),
        ]);

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

        expect(conversationUserRelationshipUserByEmail).toEqual({
          entityType: EntityType.ConversationUserRelationship,
          pk: meeting.id,
          sk: userByEmail.id,
          gsi1pk: userByEmail.id,
          gsi1sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)),
          gsi2pk: userByEmail.id,
          gsi2sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.MeetingConversation}.*`)),
          gsi3pk: userByEmail.id,
          gsi3sk: `${KeyPrefix.Time}${meeting.dueDate}`,
          dueDate: meeting.dueDate,
          role: Role.User,
          type: ConversationType.Meeting,
          conversationId: meeting.id,
          userId: userByEmail.id,
          updatedAt: jasmine.stringMatching(ISO_DATE_REGEX),
          muted: false,
        });

        expect(conversationUserRelationshipUserByPhone).toEqual({
          entityType: EntityType.ConversationUserRelationship,
          pk: meeting.id,
          sk: userByPhone.id,
          gsi1pk: userByPhone.id,
          gsi1sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)),
          gsi2pk: userByPhone.id,
          gsi2sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.MeetingConversation}.*`)),
          gsi3pk: userByPhone.id,
          gsi3sk: `${KeyPrefix.Time}${meeting.dueDate}`,
          dueDate: meeting.dueDate,
          role: Role.Admin,
          type: ConversationType.Meeting,
          conversationId: meeting.id,
          userId: userByPhone.id,
          updatedAt: jasmine.stringMatching(ISO_DATE_REGEX),
          muted: false,
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
