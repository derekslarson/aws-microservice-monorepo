/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { MakeRequired, OrganizationId, Role } from "@yac/util";
import axios from "axios";
import { generateRandomString, ISO_DATE_REGEX, URL_REGEX, wait } from "../../../../e2e/util";
import { ConversationType } from "../../src/enums/conversationType.enum";
import { EntityType } from "../../src/enums/entityType.enum";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { MessageMimeType } from "../../src/enums/message.mimeType.enum";
import { Group, RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { RawUser } from "../../src/repositories/user.dynamo.repository";
import { MessageId } from "../../src/types/messageId.type";
import { PendingMessageId } from "../../src/types/pendingMessageId.type";
import { UserId } from "../../src/types/userId.type";
import {
  createConversationUserRelationship,
  createGroup,
  createRandomUser,
  getMessage,
  getPendingMessage,
  getUser,
  GetUserOutput,
} from "../util";

describe("POST /groups/{groupId}/messages (Create Group Message)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;

  const mockOrganizationId: OrganizationId = `${KeyPrefix.Organization}${generateRandomString()}`;
  const mimeType = MessageMimeType.AudioMp3;

  describe("under normal conditions", () => {
    let user: RawUser;
    let otherUser: RawUser;
    let group: RawConversation<Group>;

    beforeAll(async () => {
      ({ user } = await getUser({ userId }) as MakeRequired<GetUserOutput, "user">);
    });

    beforeEach(async () => {
      ([ { user: otherUser }, { conversation: group } ] = await Promise.all([
        createRandomUser(),
        createGroup({ createdBy: userId, organizationId: mockOrganizationId, name: generateRandomString(5) }),
      ]));

      await Promise.all([
        createConversationUserRelationship({ type: ConversationType.Group, conversationId: group.id, userId, role: Role.Admin }),
        createConversationUserRelationship({ type: ConversationType.Group, conversationId: group.id, userId: otherUser.id, role: Role.User }),
      ]);
    });

    it("returns a valid response", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const body = { mimeType };

      try {
        const { status, data } = await axios.post(`${baseUrl}/groups/${group.id}/messages`, body, { headers });

        expect(status).toBe(201);
        expect(data).toEqual({
          pendingMessage: {
            id: jasmine.stringMatching(new RegExp(`${KeyPrefix.Message}.*`)),
            to: {
              id: group.id,
              organizationId: mockOrganizationId,
              name: group.name,
              createdBy: group.createdBy,
              createdAt: group.createdAt,
              type: group.type,
              image: jasmine.stringMatching(URL_REGEX),
            },
            from: {
              name: user.name,
              id: user.id,
              email: user.email,
              image: jasmine.stringMatching(URL_REGEX),
            },
            type: ConversationType.Group,
            mimeType,
            createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
            uploadUrl: jasmine.stringMatching(URL_REGEX),
            chunkedUploadToken: jasmine.any(String),
          },
        });
      } catch (error) {
        fail(error);
      }
    });

    it("creates a valid PendingMessage entity", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const body = { mimeType };

      try {
        const { data } = await axios.post(`${baseUrl}/groups/${group.id}/messages`, body, { headers });

        const pendingMessageId = (data.pendingMessage.id as MessageId).replace(KeyPrefix.Message, KeyPrefix.PendingMessage) as PendingMessageId;

        const { pendingMessage } = await getPendingMessage({ pendingMessageId });

        expect(pendingMessage).toEqual({
          entityType: EntityType.PendingMessage,
          pk: pendingMessageId,
          sk: pendingMessageId,
          id: pendingMessageId,
          conversationId: group.id,
          from: userId,
          createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
          mimeType,
        });
      } catch (error) {
        fail(error);
      }
    });

    it("doesn't create a Message entity", async () => {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const body = { mimeType };

      try {
        const { data } = await axios.post(`${baseUrl}/groups/${group.id}/messages`, body, { headers });

        await wait(3000);

        const { message } = await getMessage({ messageId: data.pendingMessage.id });

        expect(message).not.toBeDefined();
      } catch (error) {
        fail(error);
      }
    });
  });

  describe("under error conditions", () => {
    const mockGroupId = `${KeyPrefix.Group}${generateRandomString(5)}`;

    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const body = { mimeType };
        const headers = { };

        try {
          await axios.post(`${baseUrl}/groups/${mockGroupId}/messages`, body, { headers });
          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an id of a group that the user is not a member of is passed in", () => {
      it("throws a 403 error", async () => {
        const body = { mimeType };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.post(`${baseUrl}/groups/${mockGroupId}/messages`, body, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(403);
          expect(error.response?.statusText).toBe("Forbidden");
        }
      });
    });

    describe("when passed invalid parameters", () => {
      it("throws a 400 error with a valid structure", async () => {
        const body = { mimeType: "test" };
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.post(`${baseUrl}/groups/pants/messages`, body, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { groupId: "Failed constraint check for string: Must be a group id" },
              body: { mimeType: 'Expected "audio/mpeg" | "audio/mp4" | "video/mp4" | "video/webm", but was string' },
            },
          });
        }
      });
    });
  });
});
