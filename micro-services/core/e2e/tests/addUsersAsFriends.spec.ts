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
import { FriendConvoId } from "../../src/types/friendConvoId.type";
import { ImageMimeType } from "../../src/enums/image.mimeType.enum";

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
            { username: otherUser.username },
            { email: randomEmail },
            { phone: randomPhone },
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

        const [ { user: emailUser }, { user: phoneUser } ] = await Promise.all([
          backoff(() => getUserByEmail({ email: randomEmail }), (res) => !!res.user),
          backoff(() => getUserByPhone({ phone: randomPhone }), (res) => !!res.user),
        ]);

        if (!emailUser || !phoneUser) {
          throw new Error("Necessary user entities not created.");
        }

        expect(emailUser).toEqual({
          entityType: EntityType.User,
          pk: emailUser.id,
          sk: EntityType.User,
          id: emailUser.id,
          gsi1pk: emailUser.email,
          gsi1sk: EntityType.User,
          imageMimeType: ImageMimeType.Jpeg,
        });

        expect(phoneUser).toEqual({
          entityType: EntityType.User,
          pk: phoneUser.id,
          sk: EntityType.User,
          id: phoneUser.id,
          gsi2pk: phoneUser.phone,
          gsi2sk: EntityType.User,
          imageMimeType: ImageMimeType.Jpeg,
        });
      } catch (error) {
        fail(error);
      }
    });

    it("creates valid Conversation entities", async () => {
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

        const [ { user: emailUser }, { user: phoneUser } ] = await Promise.all([
          backoff(() => getUserByEmail({ email: randomEmail }), (res) => !!res.user),
          backoff(() => getUserByPhone({ phone: randomPhone }), (res) => !!res.user),
        ]);

        if (!emailUser || !phoneUser) {
          throw new Error("Necessary user entities not created.");
        }

        const emailUserConvoId: FriendConvoId = `${KeyPrefix.FriendConversation}${[ userId, emailUser.id ].sort().join("-")}`;
        const phoneUserConvoId: FriendConvoId = `${KeyPrefix.FriendConversation}${[ userId, phoneUser.id ].sort().join("-")}`;

        const [
          { conversation: usernameInviteConvo },
          { conversation: emailInviteConvo },
          { conversation: phoneInviteConvo },
        ] = await Promise.all([
          backoff(() => getConversation({ conversationId }), (res) => !!res.conversation),
          backoff(() => getConversation({ conversationId: emailUserConvoId }), (res) => !!res.conversation),
          backoff(() => getConversation({ conversationId: phoneUserConvoId }), (res) => !!res.conversation),
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
          pk: emailUserConvoId,
          sk: emailUserConvoId,
          id: emailUserConvoId,
          type: ConversationType.Friend,
          createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
          createdBy: userId,
        });

        expect(phoneInviteConvo).toEqual({
          entityType: EntityType.FriendConversation,
          pk: phoneUserConvoId,
          sk: phoneUserConvoId,
          id: phoneUserConvoId,
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

        const [ { user: emailUser }, { user: phoneUser } ] = await Promise.all([
          backoff(() => getUserByEmail({ email: randomEmail }), (res) => !!res.user),
          backoff(() => getUserByPhone({ phone: randomPhone }), (res) => !!res.user),
        ]);

        if (!emailUser || !phoneUser) {
          throw new Error("Necessary user entities not created.");
        }

        const emailUserConvoId: FriendConvoId = `${KeyPrefix.FriendConversation}${[ userId, emailUser.id ].sort().join("-")}`;
        const phoneUserConvoId: FriendConvoId = `${KeyPrefix.FriendConversation}${[ userId, phoneUser.id ].sort().join("-")}`;

        const [
          { conversation: usernameInviteConvo },
          { conversation: emailInviteConvo },
          { conversation: phoneInviteConvo },
        ] = await Promise.all([
          backoff(() => getConversation({ conversationId }), (res) => !!res.conversation),
          backoff(() => getConversation({ conversationId: emailUserConvoId }), (res) => !!res.conversation),
          backoff(() => getConversation({ conversationId: phoneUserConvoId }), (res) => !!res.conversation),
        ]);

        if (!usernameInviteConvo || !emailInviteConvo || !phoneInviteConvo) {
          throw new Error("Necessary conversation entities not created.");
        }

        const [
          { conversationUserRelationship: conversationUserRelationshipA },
          { conversationUserRelationship: conversationUserRelationshipB },
          { conversationUserRelationship: conversationUserRelationshipC },
          { conversationUserRelationship: conversationUserRelationshipD },
          { conversationUserRelationship: conversationUserRelationshipE },
          { conversationUserRelationship: conversationUserRelationshipF },
        ] = await Promise.all([
          backoff(() => getConversationUserRelationship({ conversationId, userId }), (res) => !!res.conversationUserRelationship),
          backoff(() => getConversationUserRelationship({ conversationId, userId: otherUser.id }), (res) => !!res.conversationUserRelationship),
          backoff(() => getConversationUserRelationship({ conversationId: emailUserConvoId, userId }), (res) => !!res.conversationUserRelationship),
          backoff(() => getConversationUserRelationship({ conversationId: emailUserConvoId, userId: emailUser.id }), (res) => !!res.conversationUserRelationship),
          backoff(() => getConversationUserRelationship({ conversationId: phoneUserConvoId, userId }), (res) => !!res.conversationUserRelationship),
          backoff(() => getConversationUserRelationship({ conversationId: phoneUserConvoId, userId: phoneUser.id }), (res) => !!res.conversationUserRelationship),
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
          pk: emailUserConvoId,
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

        expect(conversationUserRelationshipD).toEqual({
          entityType: EntityType.ConversationUserRelationship,
          pk: emailUserConvoId,
          sk: emailUser.id,
          gsi1pk: emailUser.id,
          gsi1sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)),
          gsi2pk: emailUser.id,
          gsi2sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.FriendConversation}.*`)),
          role: Role.Admin,
          type: ConversationType.Friend,
          conversationId: emailUserConvoId,
          userId: emailUser.id,
          updatedAt: jasmine.stringMatching(ISO_DATE_REGEX),
          muted: false,
        });

        expect(conversationUserRelationshipE).toEqual({
          entityType: EntityType.ConversationUserRelationship,
          pk: emailUserConvoId,
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

        expect(conversationUserRelationshipF).toEqual({
          entityType: EntityType.ConversationUserRelationship,
          pk: phoneUserConvoId,
          sk: phoneUser.id,
          gsi1pk: phoneUser.id,
          gsi1sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)),
          gsi2pk: phoneUser.id,
          gsi2sk: jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.FriendConversation}.*`)),
          role: Role.Admin,
          type: ConversationType.Friend,
          conversationId: phoneUserConvoId,
          userId: phoneUser.id,
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
          ],
        },
      };

      try {
        await axios.post(`${baseUrl}/users/${request.pathParameters.userId}/friends`, request.body, { headers });

        const [ { user }, { user: emailUser }, { user: phoneUser } ] = await Promise.all([
          backoff(() => getUser({ userId }), (res) => !!res.user),
          backoff(() => getUserByEmail({ email: randomEmail }), (res) => !!res.user),
          backoff(() => getUserByPhone({ phone: randomPhone }), (res) => !!res.user),
        ]);

        if (!user || !emailUser || !phoneUser) {
          throw new Error("Necessary user entities not created.");
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
                email: emailUser.email,
                phone: emailUser.phone,
                username: emailUser.username,
                name: emailUser.name,
                bio: emailUser.bio,
                id: emailUser.id,
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
                email: phoneUser.email,
                phone: phoneUser.phone,
                username: phoneUser.username,
                name: phoneUser.name,
                bio: phoneUser.bio,
                id: phoneUser.id,
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
