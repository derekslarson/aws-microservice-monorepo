/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Role, UserAddedToGroupSnsMessage } from "@yac/util";
import axios from "axios";
import { Static } from "runtypes";
import { backoff, generateRandomString, ISO_DATE_REGEX, URL_REGEX } from "../../../../e2e/util";
import { AddUsersToGroupDto } from "../../src/dtos/addUsersToGroup.dto";
import { ConversationType } from "../../src/enums/conversationType.enum";
import { EntityType } from "../../src/enums/entityType.enum";
import { ImageMimeType } from "../../src/enums/image.mimeType.enum";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { UniqueProperty } from "../../src/enums/uniqueProperty.enum";
import { GroupConversation, RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { UserId } from "../../src/types/userId.type";
import {
  createConversationUserRelationship,
  createGroupConversation,
  createRandomUser,
  CreateRandomUserOutput,
  deleteSnsEventsByTopicArn,
  generateRandomEmail,
  generateRandomPhone,
  getConversationUserRelationship,
  getSnsEventsByTopicArn,
  getUniqueProperty,
  getUserByEmail,
  getUserByPhone,
} from "../util";

describe("POST /groups/{groupId}/users (Add Users to Group)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;
  const userAddedToGroupSnsTopicArn = process.env["user-added-to-group-sns-topic-arn"] as string;

  const mockGroupId = `${KeyPrefix.GroupConversation}${generateRandomString(5)}`;

  describe("under normal conditions", () => {
    let otherUser: CreateRandomUserOutput["user"];
    let group: RawConversation<GroupConversation>;
    let randomEmail: string;
    let randomPhone: string;
    let randomUsername: string;

    beforeEach(async () => {
      randomEmail = generateRandomEmail();
      randomPhone = generateRandomPhone();
      randomUsername = generateRandomString(8);

      ([ { user: otherUser }, { conversation: group } ] = await Promise.all([
        createRandomUser(),
        createGroupConversation({ createdBy: userId, name: generateRandomString(5) }),
      ]));

      await createConversationUserRelationship({ type: ConversationType.Group, conversationId: group.id, userId, role: Role.Admin });
    });

    it("returns a valid response", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      const request: Static<typeof AddUsersToGroupDto> = {
        pathParameters: { groupId: group.id },
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
        const { status, data } = await axios.post(`${baseUrl}/groups/${request.pathParameters.groupId}/users`, request.body, { headers });

        expect(status).toBe(200);
        expect(data).toEqual({
          message: "Users added to group, but with some failures.",
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

      const request: Static<typeof AddUsersToGroupDto> = {
        pathParameters: { groupId: group.id },
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
        await axios.post(`${baseUrl}/groups/${request.pathParameters.groupId}/users`, request.body, { headers });

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

      const request: Static<typeof AddUsersToGroupDto> = {
        pathParameters: { groupId: group.id },
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
        await axios.post(`${baseUrl}/groups/${request.pathParameters.groupId}/users`, request.body, { headers });

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

      const request: Static<typeof AddUsersToGroupDto> = {
        pathParameters: { groupId: group.id },
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
        await axios.post(`${baseUrl}/groups/${request.pathParameters.groupId}/users`, request.body, { headers });

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
          getConversationUserRelationship({ conversationId: group.id, userId: otherUser.id }),
          getConversationUserRelationship({ conversationId: group.id, userId: userByEmail.id }),
          getConversationUserRelationship({ conversationId: group.id, userId: userByPhone.id }),
        ]);

        expect(conversationUserRelationshipOtherUser).toEqual({
          entityType: EntityType.ConversationUserRelationship,
          pk: group.id,
          sk: otherUser.id,
          gsi1pk: otherUser.id,
          gsi1sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)),
          gsi2pk: otherUser.id,
          gsi2sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.GroupConversation}.*`)),
          role: Role.Admin,
          type: ConversationType.Group,
          conversationId: group.id,
          userId: otherUser.id,
          updatedAt: jasmine.stringMatching(ISO_DATE_REGEX),
          muted: false,
        });

        expect(conversationUserRelationshipUserByEmail).toEqual({
          entityType: EntityType.ConversationUserRelationship,
          pk: group.id,
          sk: userByEmail.id,
          gsi1pk: userByEmail.id,
          gsi1sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)),
          gsi2pk: userByEmail.id,
          gsi2sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.GroupConversation}.*`)),
          role: Role.User,
          type: ConversationType.Group,
          conversationId: group.id,
          userId: userByEmail.id,
          updatedAt: jasmine.stringMatching(ISO_DATE_REGEX),
          muted: false,
        });

        expect(conversationUserRelationshipUserByPhone).toEqual({
          entityType: EntityType.ConversationUserRelationship,
          pk: group.id,
          sk: userByPhone.id,
          gsi1pk: userByPhone.id,
          gsi1sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)),
          gsi2pk: userByPhone.id,
          gsi2sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.GroupConversation}.*`)),
          role: Role.Admin,
          type: ConversationType.Group,
          conversationId: group.id,
          userId: userByPhone.id,
          updatedAt: jasmine.stringMatching(ISO_DATE_REGEX),
          muted: false,
        });
      } catch (error) {
        fail(error);
      }
    });

    it("publishes valid SNS messages", async () => {
      // wait till the group creator's sns event has been fired
      await backoff(
        () => getSnsEventsByTopicArn<UserAddedToGroupSnsMessage>({ topicArn: userAddedToGroupSnsTopicArn }),
        ({ snsEvents }) => !!snsEvents.find((snsEvent) => snsEvent.message.user.id === userId && snsEvent.message.group.id === group.id),
      );

      // clear the sns events table so the test can have a clean slate
      await deleteSnsEventsByTopicArn({ topicArn: userAddedToGroupSnsTopicArn });

      const headers = { Authorization: `Bearer ${accessToken}` };

      const request: Static<typeof AddUsersToGroupDto> = {
        pathParameters: { groupId: group.id },
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
        await axios.post(`${baseUrl}/groups/${request.pathParameters.groupId}/users`, request.body, { headers });

        const [ { user: userByEmail }, { user: userByPhone } ] = await Promise.all([
          getUserByEmail({ email: randomEmail }),
          getUserByPhone({ phone: randomPhone }),
        ]);

        if (!userByEmail || !userByPhone) {
          throw new Error("necessary user records not created");
        }

        // wait till all the events have been fired
        const { snsEvents } = await backoff(
          () => getSnsEventsByTopicArn<UserAddedToGroupSnsMessage>({ topicArn: userAddedToGroupSnsTopicArn }),
          (response) => response.snsEvents.length === 3,
        );

        expect(snsEvents.length).toBe(3);

        expect(snsEvents).toEqual(jasmine.arrayContaining([
          jasmine.objectContaining({
            message: {
              groupMemberIds: jasmine.arrayContaining([ userId ]),
              group: {
                createdBy: userId,
                id: group.id,
                image: jasmine.stringMatching(URL_REGEX),
                name: group.name,
                createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
                type: ConversationType.Group,
              },
              user: {
                email: userByEmail.email,
                id: userByEmail.id,
                image: jasmine.stringMatching(URL_REGEX),
              },
            },
          }),
          jasmine.objectContaining({
            message: {
              groupMemberIds: jasmine.arrayContaining([ userId ]),
              group: {
                createdBy: userId,
                id: group.id,
                image: jasmine.stringMatching(URL_REGEX),
                name: group.name,
                createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
                type: ConversationType.Group,
              },
              user: {
                phone: userByPhone.phone,
                id: userByPhone.id,
                image: jasmine.stringMatching(URL_REGEX),
              },
            },
          }),
          jasmine.objectContaining({
            message: {
              groupMemberIds: jasmine.arrayContaining([ userId ]),
              group: {
                createdBy: userId,
                id: group.id,
                image: jasmine.stringMatching(URL_REGEX),
                name: group.name,
                createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
                type: ConversationType.Group,
              },
              user: {
                email: otherUser.email,
                phone: otherUser.phone,
                username: otherUser.username,
                realName: otherUser.realName,
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
          await axios.post(`${baseUrl}/groups/${mockGroupId}/users`, body, { headers });
          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an id of a group that the user is not an admin of is passed in", () => {
      let groupTwo: RawConversation<GroupConversation>;
      const mockUserIdTwo: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;

      beforeEach(async () => {
        ({ conversation: groupTwo } = await createGroupConversation({ createdBy: mockUserIdTwo, name: generateRandomString(5) }));

        await createConversationUserRelationship({ type: ConversationType.Group, conversationId: groupTwo.id, userId, role: Role.User });
      });

      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const request: Static<typeof AddUsersToGroupDto> = {
          pathParameters: { groupId: groupTwo.id },
          body: {
            users: [
              { username: generateRandomString(8), role: Role.Admin },
            ],
          },
        };

        try {
          await axios.post(`${baseUrl}/groups/${request.pathParameters.groupId}/users`, request.body, { headers });

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
          await axios.post(`${baseUrl}/groups/pants/users`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { groupId: "Failed constraint check for string: Must be a group id" },
              body: { users: 'Expected ({ email: string; role: "super_admin" | "admin" | "user"; } | { phone: string; role: "super_admin" | "admin" | "user"; } | { username: string; role: "super_admin" | "admin" | "user"; })[], but was missing' },
            },
          });
        }
      });
    });
  });
});
