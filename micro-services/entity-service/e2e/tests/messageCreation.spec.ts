/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Role } from "@yac/core";
import axios from "axios";
import { generateRandomString } from "../../../../e2e/util";
import { RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { UserId } from "../../src/types/userId.type";
import { MimeType } from "../../src/enums/mimeType.enum";
import { createConversationUserRelationship, createGroupConversation } from "../util";

fdescribe("GET /groups/{groupId}/messages (Get Messages by Group Id)", () => {
  const baseUrl = process.env.baseUrl as string;
  const userId = process.env.userId as UserId;
  const accessToken = process.env.accessToken as string;

  describe("under normal conditions", () => {
    let group: RawConversation;

    beforeAll(async () => {
      ({ conversation: group } = await createGroupConversation({ createdBy: userId, name: generateRandomString(5) }));

      await createConversationUserRelationship({ conversationId: group.id, userId, role: Role.User });
    });

    describe("when not passed a 'limit' query param", () => {
      it("returns a valid response", async () => {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const body = { mimeType: MimeType.AudioMp3 };

        try {
          console.log({
            accessToken,
            path: `${baseUrl}/groups/${group.id}/messages`,
          });

          const { data: createMessageResponse } = await axios.post(`${baseUrl}/groups/${group.id}/messages`, body, { headers });

          console.log(JSON.stringify(createMessageResponse, null, 2));
        } catch (error) {
          fail(error);
        }
      });
    });
  });
});
