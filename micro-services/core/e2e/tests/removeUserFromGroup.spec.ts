/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import { Role, UserRemovedFromGroupSnsMessage } from "@yac/util";
import { createRandomUser, createConversationUserRelationship, createGroupConversation, getConversationUserRelationship, CreateRandomUserOutput, deleteSnsEventsByTopicArn, getSnsEventsByTopicArn } from "../util";
import { UserId } from "../../src/types/userId.type";
import { backoff, generateRandomString, URL_REGEX } from "../../../../e2e/util";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { GroupConversation, RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { GroupId } from "../../src/types/groupId.type";
import { ConversationType } from "../../src/enums/conversationType.enum";

describe("DELETE /groups/{groupId}/users/{userId} (Remove User from Group)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;
  const userRemovedFromGroupSnsTopicArn = process.env["user-removed-from-group-sns-topic-arn"] as string;

  const mockUserId: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;
  const mockGroupId: GroupId = `${KeyPrefix.GroupConversation}${generateRandomString(5)}`;

  describe("under normal conditions", () => {
    let group: RawConversation<GroupConversation>;
    let otherUser: CreateRandomUserOutput["user"];

    beforeAll(async () => {
      ({ user: otherUser } = await createRandomUser());
    });

    beforeEach(async () => {
      ({ conversation: group } = await createGroupConversation({ createdBy: userId, name: generateRandomString(5) }));

      await Promise.all([
        createConversationUserRelationship({ type: ConversationType.Group, userId, conversationId: group.id, role: Role.Admin }),
        createConversationUserRelationship({ type: ConversationType.Group, userId: otherUser.id, conversationId: group.id, role: Role.User }),
      ]);

      // clear the sns events table so the tests can have a clean slate
      await deleteSnsEventsByTopicArn({ topicArn: userRemovedFromGroupSnsTopicArn });
    });

    it("returns a valid response", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        const { status, data } = await axios.delete(`${baseUrl}/groups/${group.id}/users/${otherUser.id}`, { headers });

        expect(status).toBe(200);
        expect(data).toEqual({ message: "User removed from group." });
      } catch (error) {
        fail(error);
      }
    });

    it("deletes the necessary ConversationUserRelationship entity", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        await axios.delete(`${baseUrl}/groups/${group.id}/users/${otherUser.id}`, { headers });

        const { conversationUserRelationship } = await getConversationUserRelationship({ conversationId: group.id, userId: otherUser.id });

        expect(conversationUserRelationship).not.toBeDefined();
      } catch (error) {
        fail(error);
      }
    });

    it("publishes a valid SNS message", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };

      try {
        await axios.delete(`${baseUrl}/groups/${group.id}/users/${otherUser.id}`, { headers });

        // wait the event has been fired
        const { snsEvents } = await backoff(
          () => getSnsEventsByTopicArn<UserRemovedFromGroupSnsMessage>({ topicArn: userRemovedFromGroupSnsTopicArn }),
          (response) => response.snsEvents.length === 1,
        );

        expect(snsEvents.length).toBe(1);

        expect(snsEvents[0]).toEqual(jasmine.objectContaining({
          message: {
            groupMemberIds: jasmine.arrayContaining([ userId ]),
            group: {
              createdBy: userId,
              id: group.id,
              image: jasmine.stringMatching(URL_REGEX),
              name: group.name,
            },
            user: {
              email: otherUser.email,
              id: otherUser.id,
              phone: otherUser.phone,
              username: otherUser.username,
              realName: otherUser.realName,
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
          await axios.delete(`${baseUrl}/groups/${mockGroupId}/users/${mockUserId}`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an id of a group the user is not an admin of is passed in", () => {
      let groupTwo: RawConversation<GroupConversation>;
      const mockUserIdTwo: UserId = `${KeyPrefix.User}${generateRandomString(5)}`;

      beforeEach(async () => {
        ({ conversation: groupTwo } = await createGroupConversation({ createdBy: mockUserIdTwo, name: generateRandomString(5) }));

        await createConversationUserRelationship({ type: ConversationType.Group, userId, conversationId: groupTwo.id, role: Role.User });
      });

      it("throws a 403 error", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.delete(`${baseUrl}/groups/${groupTwo.id}/users/${mockUserId}`, { headers });

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
          await axios.delete(`${baseUrl}/groups/invalid-id/users/invalid-id-two`, { headers });

          fail("Expected an error");
        } catch (error) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: {
                groupId: "Failed constraint check for string: Must be a group id",
                userId: "Failed constraint check for string: Must be a user id",
              },
            },
          });
        }
      });
    });
  });
});
