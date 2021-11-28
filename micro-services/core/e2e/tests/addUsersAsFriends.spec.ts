/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { Role, UserAddedAsFriendSnsMessage } from "@yac/util";
import { Static } from "runtypes";
import {
  createRandomUser,
  CreateRandomUserOutput,
  deleteSnsEventsByTopicArn,
  generateRandomEmail,
  generateRandomPhone,
  getConversation,
  getConversationUserRelationship,
  getSnsEventsByTopicArn,
  getUniqueProperty,
  getUser,
  getUserByEmail,
  getUserByPhone,
} from "../util";
import { UserId } from "../../src/types/userId.type";
import { backoff, generateRandomString, ISO_DATE_REGEX, URL_REGEX } from "../../../../e2e/util";
import { EntityType } from "../../src/enums/entityType.enum";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { ConversationType } from "../../src/enums/conversationType.enum";
import { AddUsersAsFriendsDto } from "../../src/dtos/addUsersAsFriends.dto";
import { ImageMimeType } from "../../src/enums/image.mimeType.enum";
import { FriendConvoId } from "../../src/types/friendConvoId.type";
import { UniqueProperty } from "../../src/enums/uniqueProperty.enum";

describe("POST /users/{userId}/friends (Add Users as Friends)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;
  const userAddedAsFriendSnsTopicArn = process.env["user-added-as-friend-sns-topic-arn"] as string;

  describe("under normal conditions", () => {
    let otherUser: CreateRandomUserOutput["user"];
    let conversationId: FriendConvoId;
    let randomEmail: string;
    let randomPhone: string;
    let randomUsername: string;

    beforeEach(async () => {
      randomEmail = generateRandomEmail();
      randomPhone = generateRandomPhone();
      randomUsername = generateRandomString(8);

      ({ user: otherUser } = await createRandomUser());

      conversationId = `${KeyPrefix.FriendConversation}${[ userId, otherUser.id ].sort().join("-")}`;
    });

    it("returns a valid response", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      const request: Static<typeof AddUsersAsFriendsDto> = {
        pathParameters: { userId },
        body: {
          users: [
            { username: otherUser.username },
            { email: randomEmail },
            { phone: randomPhone },
            { username: randomUsername },
          ],
        },
      };

      try {
        const { status, data } = await axios.post(`${baseUrl}/users/${request.pathParameters.userId}/friends`, request.body, { headers });

        expect(status).toBe(200);
        expect(data).toEqual({
          message: "Users added as friends, but with some failures.",
          successes: jasmine.arrayContaining([
            {
              id: jasmine.stringMatching(new RegExp(`${KeyPrefix.User}.*`)),
              username: otherUser.username,
              name: otherUser.name,
              bio: otherUser.bio,
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
            { username: randomUsername },
          ],
        });
      } catch (error) {
        fail(error);
      }
    });

    it("creates valid User entities", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      const request: Static<typeof AddUsersAsFriendsDto> = {
        pathParameters: { userId },
        body: {
          users: [
            { username: otherUser.username },
            { email: randomEmail },
            { phone: randomPhone },
            { username: randomUsername },
          ],
        },
      };

      try {
        await axios.post(`${baseUrl}/users/${request.pathParameters.userId}/friends`, request.body, { headers });

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

      const request: Static<typeof AddUsersAsFriendsDto> = {
        pathParameters: { userId },
        body: {
          users: [
            { username: otherUser.username },
            { email: randomEmail },
            { phone: randomPhone },
            { username: randomUsername },
          ],
        },
      };

      try {
        await axios.post(`${baseUrl}/users/${request.pathParameters.userId}/friends`, request.body, { headers });

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

    it("creates a valid Conversation entities", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      const request: Static<typeof AddUsersAsFriendsDto> = {
        pathParameters: { userId },
        body: {
          users: [
            { username: otherUser.username },
            { email: randomEmail },
            { phone: randomPhone },
            { username: randomUsername },
          ],
        },
      };

      try {
        await axios.post(`${baseUrl}/users/${request.pathParameters.userId}/friends`, request.body, { headers });

        const [ { user: userByEmail }, { user: userByPhone } ] = await Promise.all([
          getUserByEmail({ email: randomEmail }),
          getUserByPhone({ phone: randomPhone }),
        ]);

        if (!userByEmail || !userByPhone) {
          throw new Error("necessary user records not created");
        }

        const userByEmailConversationId: FriendConvoId = `${KeyPrefix.FriendConversation}${[ userId, userByEmail?.id ].sort().join("-")}`;
        const userByPhoneConversationId: FriendConvoId = `${KeyPrefix.FriendConversation}${[ userId, userByPhone?.id ].sort().join("-")}`;

        const [
          { conversation: usernameInviteConvo },
          { conversation: emailInviteConvo },
          { conversation: phoneInviteConvio },
        ] = await Promise.all([
          getConversation({ conversationId }),
          getConversation({ conversationId: userByEmailConversationId }),
          getConversation({ conversationId: userByPhoneConversationId }),
        ]);

        expect(usernameInviteConvo).toEqual({
          entityType: EntityType.FriendConversation,
          pk: conversationId,
          sk: conversationId,
          id: conversationId,
          type: ConversationType.Friend,
          createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
          createdBy: userId,
        });

        expect(emailInviteConvo).toEqual({
          entityType: EntityType.FriendConversation,
          pk: userByEmailConversationId,
          sk: userByEmailConversationId,
          id: userByEmailConversationId,
          type: ConversationType.Friend,
          createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
          createdBy: userId,
        });

        expect(phoneInviteConvio).toEqual({
          entityType: EntityType.FriendConversation,
          pk: userByPhoneConversationId,
          sk: userByPhoneConversationId,
          id: userByPhoneConversationId,
          type: ConversationType.Friend,
          createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
          createdBy: userId,
        });
      } catch (error) {
        fail(error);
      }
    });

    it("creates valid ConversationUserRelationship entities", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      const request: Static<typeof AddUsersAsFriendsDto> = {
        pathParameters: { userId },
        body: {
          users: [
            { username: otherUser.username },
            { email: randomEmail },
            { phone: randomPhone },
            { username: randomUsername },
          ],
        },
      };

      try {
        await axios.post(`${baseUrl}/users/${request.pathParameters.userId}/friends`, request.body, { headers });

        const [ { user: userByEmail }, { user: userByPhone } ] = await Promise.all([
          getUserByEmail({ email: randomEmail }),
          getUserByPhone({ phone: randomPhone }),
        ]);

        if (!userByEmail || !userByPhone) {
          throw new Error("necessary user records not created");
        }

        const userByEmailConversationId: FriendConvoId = `${KeyPrefix.FriendConversation}${[ userId, userByEmail.id ].sort().join("-")}`;
        const userByPhoneConversationId: FriendConvoId = `${KeyPrefix.FriendConversation}${[ userId, userByPhone.id ].sort().join("-")}`;

        const [
          { conversationUserRelationship: conversationUserRelationshipA },
          { conversationUserRelationship: conversationUserRelationshipB },
          { conversationUserRelationship: conversationUserRelationshipC },
          { conversationUserRelationship: conversationUserRelationshipD },
          { conversationUserRelationship: conversationUserRelationshipE },
          { conversationUserRelationship: conversationUserRelationshipF },
        ] = await Promise.all([
          getConversationUserRelationship({ conversationId, userId }),
          getConversationUserRelationship({ conversationId, userId: otherUser.id }),
          getConversationUserRelationship({ conversationId: userByEmailConversationId, userId }),
          getConversationUserRelationship({ conversationId: userByEmailConversationId, userId: userByEmail.id }),
          getConversationUserRelationship({ conversationId: userByPhoneConversationId, userId }),
          getConversationUserRelationship({ conversationId: userByPhoneConversationId, userId: userByPhone.id }),
        ]);

        expect(conversationUserRelationshipA).toEqual({
          entityType: EntityType.ConversationUserRelationship,
          pk: conversationId,
          sk: userId,
          gsi1pk: userId,
          gsi1sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)),
          gsi2pk: userId,
          gsi2sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.FriendConversation}.*`)),
          role: Role.Admin,
          type: ConversationType.Friend,
          conversationId,
          userId,
          updatedAt: jasmine.stringMatching(ISO_DATE_REGEX),
          muted: false,
        });

        expect(conversationUserRelationshipB).toEqual({
          entityType: EntityType.ConversationUserRelationship,
          pk: conversationId,
          sk: otherUser.id,
          gsi1pk: otherUser.id,
          gsi1sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)),
          gsi2pk: otherUser.id,
          gsi2sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.FriendConversation}.*`)),
          role: Role.Admin,
          type: ConversationType.Friend,
          conversationId,
          userId: otherUser.id,
          updatedAt: jasmine.stringMatching(ISO_DATE_REGEX),
          muted: false,
        });

        expect(conversationUserRelationshipC).toEqual({
          entityType: EntityType.ConversationUserRelationship,
          pk: userByEmailConversationId,
          sk: userId,
          gsi1pk: userId,
          gsi1sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)),
          gsi2pk: userId,
          gsi2sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.FriendConversation}.*`)),
          role: Role.Admin,
          type: ConversationType.Friend,
          conversationId: userByEmailConversationId,
          userId,
          updatedAt: jasmine.stringMatching(ISO_DATE_REGEX),
          muted: false,
        });

        expect(conversationUserRelationshipD).toEqual({
          entityType: EntityType.ConversationUserRelationship,
          pk: userByEmailConversationId,
          sk: userByEmail.id,
          gsi1pk: userByEmail.id,
          gsi1sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)),
          gsi2pk: userByEmail.id,
          gsi2sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.FriendConversation}.*`)),
          role: Role.Admin,
          type: ConversationType.Friend,
          conversationId: userByEmailConversationId,
          userId: userByEmail.id,
          updatedAt: jasmine.stringMatching(ISO_DATE_REGEX),
          muted: false,
        });

        expect(conversationUserRelationshipE).toEqual({
          entityType: EntityType.ConversationUserRelationship,
          pk: userByPhoneConversationId,
          sk: userId,
          gsi1pk: userId,
          gsi1sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)),
          gsi2pk: userId,
          gsi2sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.FriendConversation}.*`)),
          role: Role.Admin,
          type: ConversationType.Friend,
          conversationId: userByPhoneConversationId,
          userId,
          updatedAt: jasmine.stringMatching(ISO_DATE_REGEX),
          muted: false,
        });

        expect(conversationUserRelationshipF).toEqual({
          entityType: EntityType.ConversationUserRelationship,
          pk: userByPhoneConversationId,
          sk: userByPhone.id,
          gsi1pk: userByPhone.id,
          gsi1sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)),
          gsi2pk: userByPhone.id,
          gsi2sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.FriendConversation}.*`)),
          role: Role.Admin,
          type: ConversationType.Friend,
          conversationId: userByPhoneConversationId,
          userId: userByPhone.id,
          updatedAt: jasmine.stringMatching(ISO_DATE_REGEX),
          muted: false,
        });
      } catch (error) {
        fail(error);
      }
    });

    it("publishes valid SNS messages", async () => {
      // clear the sns events table so the test can have a clean slate
      await deleteSnsEventsByTopicArn({ topicArn: userAddedAsFriendSnsTopicArn });

      const headers = { Authorization: `Bearer ${accessToken}` };

      const request: Static<typeof AddUsersAsFriendsDto> = {
        pathParameters: { userId },
        body: {
          users: [
            { username: otherUser.username },
            { email: randomEmail },
            { phone: randomPhone },
            { username: randomUsername },
          ],
        },
      };

      try {
        await axios.post(`${baseUrl}/users/${request.pathParameters.userId}/friends`, request.body, { headers });

        const [ { user }, { user: userByEmail }, { user: userByPhone } ] = await Promise.all([
          getUser({ userId }),
          getUserByEmail({ email: randomEmail }),
          getUserByPhone({ phone: randomPhone }),
        ]);

        if (!user || !userByEmail || !userByPhone) {
          throw new Error("necessary user records not created");
        }

        // wait till all the events have been fired
        const { snsEvents } = await backoff(
          () => getSnsEventsByTopicArn<UserAddedAsFriendSnsMessage>({ topicArn: userAddedAsFriendSnsTopicArn }),
          (response) => response.snsEvents.length === 3,
        );

        expect(snsEvents.length).toBe(3);

        expect(snsEvents).toEqual(jasmine.arrayContaining([
          jasmine.objectContaining({
            message: {
              addingUser: {
                id: user.id,
                email: user.email,
                username: user.username,
                phone: user.phone,
                bio: user.bio,
                image: jasmine.stringMatching(URL_REGEX),
              },
              addedUser: {
                email: userByEmail.email,
                id: userByEmail.id,
                image: jasmine.stringMatching(URL_REGEX),
              },
            },
          }),
          jasmine.objectContaining({
            message: {
              addingUser: {
                id: user.id,
                email: user.email,
                username: user.username,
                phone: user.phone,
                name: user.name,
                image: jasmine.stringMatching(URL_REGEX),
              },
              addedUser: {
                phone: userByPhone.phone,
                id: userByPhone.id,
                image: jasmine.stringMatching(URL_REGEX),
              },
            },
          }),
          jasmine.objectContaining({
            message: {
              addingUser: {
                id: user.id,
                email: user.email,
                username: user.username,
                phone: user.phone,
                name: user.name,
                bio: user.bio,
                image: jasmine.stringMatching(URL_REGEX),
              },
              addedUser: {
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
        const headers = {};

        try {
          await axios.post(`${baseUrl}/users/${userId}/friends`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an id of a user different than the one in the access token is passed in", () => {
      const mockUserIdTwo: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;

      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const request: Static<typeof AddUsersAsFriendsDto> = {
          pathParameters: { userId: mockUserIdTwo },
          body: {
            users: [
              { username: generateRandomString(8) },
            ],
          },
        };

        try {
          await axios.post(`${baseUrl}/users/${request.pathParameters.userId}/friends`, request.body, { headers });

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
          await axios.post(`${baseUrl}/users/pants/friends`, body, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { userId: "Failed constraint check for string: Must be a user id" },
              body: { users: "Expected ({ email: string; } | { phone: string; } | { username: string; })[], but was missing" },
            },
          });
        }
      });
    });
  });
});
