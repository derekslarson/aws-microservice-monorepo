/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import WebSocket from "ws";
import { UserRemovedFromGroupSnsMessage } from "@yac/util";
import { backoff, createRandomAuthServiceUser, getAccessTokenByEmail, sns } from "../../../../e2e/util";
import { WebSocketEvent } from "../../src/enums/webSocket.event.enum";
import { UserRemovedFromGroupWebSocketMessage } from "../../src/models/websocket-messages/userRemovedFromGroup.websocket.message";

describe("User Removed From Group (WebSocket Event)", () => {
  const webSocketUrl = process.env.webSocketUrl as string;
  const userRemovedFromGroupSnsTopicArn = process.env["user-removed-from-group-sns-topic-arn"] as string;
  let userOneId: string;
  let userTwoId: string;

  const connections: Record<string, { messages: UserRemovedFromGroupWebSocketMessage[]; instance: null | WebSocket; }> = {
    userOneA: {
      messages: [],
      instance: null,
    },
    userOneB: {
      messages: [],
      instance: null,
    },
    userTwo: {
      messages: [],
      instance: null,
    },
    userThree: {
      messages: [],
      instance: null,
    },
  };

  beforeAll(async () => {
    // Create three users in cognito
    const [ { email: emailOne, id: idOne }, { email: emailTwo, id: idTwo }, { email: emailThree } ] = await Promise.all([
      createRandomAuthServiceUser(),
      createRandomAuthServiceUser(),
      createRandomAuthServiceUser(),
    ]);

    userOneId = idOne;
    userTwoId = idTwo;

    // Get JWT tokens for each user
    const [ { accessToken: accessTokenOne }, { accessToken: accessTokenTwo }, { accessToken: accessTokenThree } ] = await Promise.all([
      getAccessTokenByEmail(emailOne),
      getAccessTokenByEmail(emailTwo),
      getAccessTokenByEmail(emailThree),
    ]);

    // Establish connections for all three users (two different connections for userOne)
    connections.userOneA.instance = new WebSocket(`${webSocketUrl}?token=${accessTokenOne}`);
    connections.userOneB.instance = new WebSocket(`${webSocketUrl}?token=${accessTokenOne}`);
    connections.userTwo.instance = new WebSocket(`${webSocketUrl}?token=${accessTokenTwo}`);
    connections.userThree.instance = new WebSocket(`${webSocketUrl}?token=${accessTokenThree}`);

    // Wait for them all to successfully connect, and add the 'onMessage' handlers to push messages to their respective arrays
    await Promise.all(Object.keys(connections).map((connectionName) => new Promise((resolve, reject) => {
      const instance: WebSocket = connections[connectionName].instance as WebSocket;

      instance.on("error", (error) => reject(error));
      instance.on("open", (event: unknown) => resolve(event));
      instance.on("message", (event) => {
        const message = JSON.parse(event as string);

        if (message.event === WebSocketEvent.UserRemovedFromGroup) {
          connections[connectionName].messages.push(message);
        }
      });
    })));
  });

  beforeEach(() => {
    // Wipe all the message arrays between each test
    Object.keys(connections).forEach((connectionName) => {
      connections[connectionName].messages = [];
    });
  });

  describe("under normal conditions", () => {
    it("sends valid websocket events to the correct connectionIds", async () => {
      // Add two of the three users to groupMemberIds, so that we can make sure the event isn't going to every user
      const message: UserRemovedFromGroupSnsMessage = {
        groupMemberIds: [ userOneId, userTwoId ],
        group: {
          id: "group_123",
          name: "test group",
          image: "test-image",
          createdBy: "user-123",
          createdAt: new Date().toISOString(),
        },
        user: {
          id: "user-123",
          image: "test-image",
        },
      };

      await sns.publish({
        TopicArn: userRemovedFromGroupSnsTopicArn,
        Message: JSON.stringify(message),
      }).promise();

      // Wait until all the expected messages arrive
      await Promise.all([
        backoff(() => Promise.resolve(connections.userOneA.messages), (arr) => arr.length > 0),
        backoff(() => Promise.resolve(connections.userOneB.messages), (arr) => arr.length > 0),
        backoff(() => Promise.resolve(connections.userTwo.messages), (arr) => arr.length > 0),
      ]);

      // Assert that they have the right structure
      expect(connections.userOneA.messages.length).toBe(1);
      expect(connections.userOneA.messages[0]).toEqual({
        event: WebSocketEvent.UserRemovedFromGroup,
        data: {
          group: message.group,
          user: message.user,
        },
      });

      expect(connections.userOneB.messages.length).toBe(1);
      expect(connections.userOneB.messages[0]).toEqual({
        event: WebSocketEvent.UserRemovedFromGroup,
        data: {
          group: message.group,
          user: message.user,
        },
      });

      expect(connections.userTwo.messages.length).toBe(1);
      expect(connections.userTwo.messages[0]).toEqual({
        event: WebSocketEvent.UserRemovedFromGroup,
        data: {
          group: message.group,
          user: message.user,
        },
      });

      expect(connections.userThree.messages.length).toBe(0);
    });
  });
});
