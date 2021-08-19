/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { Role, UserRemovedAsFriendSnsMessage } from "@yac/util";
import { createRandomUser, createConversationUserRelationship, createFriendConversation, getConversation, getConversationUserRelationship, CreateRandomUserOutput, deleteSnsEventsByTopicArn, getUser, getSnsEventsByTopicArn } from "../util";
import { UserId } from "../../src/types/userId.type";
import { backoff, generateRandomString, URL_REGEX } from "../../../../e2e/util";
import { ConversationId } from "../../src/types/conversationId.type";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { ConversationType } from "../../src/enums/conversationType.enum";

describe("DELETE /users/{userId}/friends/{friendId} (Remove User as Friend)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;
  const userRemovedAsFriendSnsTopicArn = process.env["user-removed-as-friend-sns-topic-arn"] as string;

  const mockUserId: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;

  describe("under normal conditions", () => {
    let otherUser: CreateRandomUserOutput["user"];
    let conversationId: ConversationId;

    beforeEach(async () => {
      ({ user: otherUser } = await createRandomUser());

      const { conversation } = await createFriendConversation({ userId, friendId: otherUser.id });
      conversationId = conversation.id;

      await Promise.all([
        createConversationUserRelationship({ type: ConversationType.Friend, userId, conversationId, role: Role.Admin }),
        createConversationUserRelationship({ type: ConversationType.Friend, userId: otherUser.id, conversationId, role: Role.Admin }),
      ]);
    });

    it("returns a valid response", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.delete(`${baseUrl}/users/${userId}/friends/${otherUser.id}`, { headers });

        expect(status).toBe(200);
        expect(data).toEqual({ message: "User removed as friend." });
      } catch (error) {
        fail(error);
      }
    });

    it("deletes the necessary Conversation entity", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        await axios.delete(`${baseUrl}/users/${userId}/friends/${otherUser.id}`, { headers });

        const { conversation } = await getConversation({ conversationId });

        expect(conversation).not.toBeDefined();
      } catch (error) {
        fail(error);
      }
    });

    it("deletes the necessary ConversationUserRelationship entities", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        await axios.delete(`${baseUrl}/users/${userId}/friends/${otherUser.id}`, { headers });

        const [
          { conversationUserRelationship: conversationUserRelationshipA },
          { conversationUserRelationship: conversationUserRelationshipB },
        ] = await Promise.all([
          getConversationUserRelationship({ conversationId, userId }),
          getConversationUserRelationship({ conversationId, userId: otherUser.id }),
        ]);

        expect(conversationUserRelationshipA).not.toBeDefined();
        expect(conversationUserRelationshipB).not.toBeDefined();
      } catch (error) {
        fail(error);
      }
    });

    it("publishes valid SNS messages", async () => {
      // clear the sns events table so the test can have a clean slate
      await deleteSnsEventsByTopicArn({ topicArn: userRemovedAsFriendSnsTopicArn });

      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        await axios.delete(`${baseUrl}/users/${userId}/friends/${otherUser.id}`, { headers });

        const { user } = await getUser({ userId });

        if (!user) {
          throw new Error("necessary user records not created");
        }

        // wait till all the events have been fired
        const { snsEvents } = await backoff(
          () => getSnsEventsByTopicArn<UserRemovedAsFriendSnsMessage>({ topicArn: userRemovedAsFriendSnsTopicArn }),
          (response) => response.snsEvents.length === 1,
        );

        expect(snsEvents.length).toBe(1);

        expect(snsEvents).toEqual([
          jasmine.objectContaining({
            message: {
              userA: {
                id: user.id,
                email: user.email,
                username: user.username,
                phone: user.phone,
                realName: user.realName,
                image: jasmine.stringMatching(URL_REGEX),
              },
              userB: {
                id: otherUser.id,
                email: otherUser.email,
                username: otherUser.username,
                phone: otherUser.phone,
                realName: otherUser.realName,
                image: jasmine.stringMatching(URL_REGEX),
              },
            },
          }),
        ]);
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
          await axios.delete(`${baseUrl}/users/${userId}/friends/${mockUserId}`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an id of a user different than the one in the access token is passed in", () => {
      const mockUserIdTwo = `${KeyPrefix.User}bcd-234`;

      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.delete(`${baseUrl}/users/${mockUserId}/friends/${mockUserIdTwo}`, { headers });

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
          await axios.delete(`${baseUrl}/users/test/friends/foo`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: {
                userId: "Failed constraint check for string: Must be a user id",
                friendId: "Failed constraint check for string: Must be a user id",
              },
            },
          });
        }
      });
    });
  });
});
