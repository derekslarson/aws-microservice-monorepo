/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import axios from "axios";
import { MessageMimeType, OrganizationId } from "@yac/util";
import { generateRandomString, getAccessToken } from "../../../../e2e/util";
import { createGroup, createMessage, createRandomUser, getMessage } from "../util";
import { UserId } from "../../src/types/userId.type";
import { RawMessage } from "../../src/repositories/message.dynamo.repository";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";

describe("PATCH /messages/{messageId} (Update Message)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;
  const mockOrganizationId: OrganizationId = `${KeyPrefix.Organization}${generateRandomString()}`;

  let message: RawMessage;
  beforeEach(async () => {
    const { conversation } = await createGroup({ createdBy: userId, organizationId: mockOrganizationId, name: generateRandomString(5) });
    ({ message } = await createMessage({
      from: userId,
      conversationId: conversation.id,
      conversationMemberIds: [ userId, userId ],
      replyCount: 0,
      mimeType: MessageMimeType.AudioMp3,
      transcript: generateRandomString(5),
    }));
  });

  describe("under normal conditions", () => {
    describe("when passed 'transcript' value", () => {
      const body = { transcript: generateRandomString(5) };

      it("returns a valid response", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          const { status, data } = await axios.patch(`${baseUrl}/messages/${message.id}`, body, { headers });

          expect(status).toBe(200);
          expect(data).toEqual({ message: "Message updated." });
        } catch (error) {
          fail(error);
        }
      });

      it("updates the Message entity", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };

        try {
          await axios.patch(`${baseUrl}/messages/${message.id}`, body, { headers });

          const { message: messageEntity } = await getMessage({ messageId: message.id });

          if (!messageEntity) {
            throw new Error("message entity not found");
          }

          expect(messageEntity).toEqual({
            ...messageEntity,
            ...body,
          });
        } catch (error) {
          fail(error);
        }
      });
    });
  });

  describe("under error conditions", () => {
    describe("when an access token is not passed in the headers", () => {
      it("throws a 401 error", async () => {
        const headers = {};
        const body = { transcript: generateRandomString(5) };

        try {
          await axios.patch(`${baseUrl}/messages/${message.id}`, body, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.statusText).toBe("Unauthorized");
        }
      });
    });

    describe("when an access token from a user who did not send the message passed in", () => {
      it("throws a 403 error", async () => {
        const { user: randomUser } = await createRandomUser();
        const { accessToken: wrongAccessToken } = await getAccessToken(randomUser.id);
        const headers = { Authorization: `Bearer ${wrongAccessToken}` };
        const body = { transcript: generateRandomString(5) };

        try {
          await axios.patch(`${baseUrl}/messages/${message.id}`, body, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(403);
          expect(error.response?.statusText).toBe("Forbidden");
        }
      });
    });

    describe("when passed invalid parameters", () => {
      it("throws a 400 error with a valid structure", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const body = { transcript: false };

        try {
          await axios.patch(`${baseUrl}/messages/test`, body, { headers });

          fail("Expected an error");
        } catch (error: any) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.statusText).toBe("Bad Request");
          expect(error.response?.data).toEqual({
            message: "Error validating request",
            validationErrors: {
              pathParameters: { messageId: "Failed constraint check for string: Must be a message id" },
              body: { transcript: "Expected string, but was boolean" },
            },
          });
        }
      });
    });
  });
});
