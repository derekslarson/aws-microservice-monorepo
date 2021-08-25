/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import WebSocket from "ws";
import { GroupMessageUpdatedSnsMessage } from "@yac/util";
import { backoff, createRandomCognitoUser, getAccessTokenByEmail, sns } from "../../../../e2e/util";
import { WebSocketEvent } from "../../src/enums/webSocket.event.enum";
import { GroupMessageUpdatedWebSocketMessage } from "../../src/models/websocket-messages/groupMessageUpdated.websocket.message";
import { UserId } from "../../../core/src/types/userId.type";

describe("Group Message Updated (WebSocket Event)", () => {
  const webSocketUrl = process.env.webSocketUrl as string;
  const groupMessageUpdatedSnsTopicArn = process.env["group-message-updated-sns-topic-arn"] as string;
  let userOneId: UserId;
  let userTwoId: UserId;

  const connections: Record<string, { messages: GroupMessageUpdatedWebSocketMessage[], instance: null | WebSocket }> = {
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
      createRandomCognitoUser(),
      createRandomCognitoUser(),
      createRandomCognitoUser(),
    ]);

    userOneId = idOne;
    userTwoId = idTwo;

    // Get JWT tokens for each user
    const [ { accessToken: accessTokenOne }, { accessToken: accessTokenTwo }, { accessToken: accessTokenThree } ] = await Promise.all([
      getAccessTokenByEmail(emailOne),
      getAccessTokenByEmail(emailTwo),
      getAccessTokenByEmail(emailThree),
    ]);

    // Establish connections for both users (two different connections for userOne)
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

        if (message.event === WebSocketEvent.GroupMessageUpdated) {
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
      const message: GroupMessageUpdatedSnsMessage = {
        groupMemberIds: [ userOneId, userTwoId ],
        to: {
          id: "convo-group-id",
          name: "mock-name",
          image: "mock-image",
          createdBy: "user-mock-id",
          createdAt: new Date().toISOString(),
        },
        from: {
          id: userTwoId,
          image: "test-image-two",
        },
        message: {
          id: "message-id",
          to: "convo-group-id",
          from: userTwoId,
          type: "group",
          createdAt: new Date().toISOString(),
          seenAt: { [userOneId]: new Date().toISOString() },
          reactions: {},
          replyCount: 0,
          mimeType: "audio/mpeg",
          fetchUrl: "mock-fetch-url",
          fromImage: "mock-from-image",
        },
      };

      await sns.publish({
        TopicArn: groupMessageUpdatedSnsTopicArn,
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
        event: WebSocketEvent.GroupMessageUpdated,
        data: {
          to: message.to,
          from: message.from,
          message: message.message,
        },
      });

      expect(connections.userOneB.messages.length).toBe(1);
      expect(connections.userOneB.messages[0]).toEqual({
        event: WebSocketEvent.GroupMessageUpdated,
        data: {
          to: message.to,
          from: message.from,
          message: message.message,
        },
      });

      expect(connections.userTwo.messages.length).toBe(1);
      expect(connections.userTwo.messages[0]).toEqual({
        event: WebSocketEvent.GroupMessageUpdated,
        data: {
          to: message.to,
          from: message.from,
          message: message.message,
        },
      });

      expect(connections.userThree.messages.length).toBe(0);
    });
  });
});
