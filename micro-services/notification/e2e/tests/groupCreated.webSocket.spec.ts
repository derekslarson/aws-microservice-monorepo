/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import WebSocket from "ws";
import { GroupCreatedSnsMessage, User } from "@yac/util";
import { backoff, createRandomAuthServiceUser, getAccessTokenByEmail, sns } from "../../../../e2e/util";
import { WebSocketEvent } from "../../src/enums/webSocket.event.enum";
import { GroupCreatedWebSocketMessage } from "../../src/models/websocket-messages/groupCreated.websocket.message";

describe("Group Created (WebSocket Event)", () => {
  const webSocketUrl = process.env.webSocketUrl as string;
  const groupCreatedSnsTopicArn = process.env["group-created-sns-topic-arn"] as string;
  let userOneId: User["id"];
  let userThreeId: User["id"];
  const mockDate = new Date().toISOString();

  const connections: Record<string, { messages: GroupCreatedWebSocketMessage[], instance: null | WebSocket }> = {
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
    // Create two users in cognito
    const [ { email: emailOne, id: idOne }, { email: emailTwo }, { email: emailThree, id: idThree } ] = await Promise.all([
      createRandomAuthServiceUser(),
      createRandomAuthServiceUser(),
      createRandomAuthServiceUser(),
    ]);

    userOneId = idOne as User["id"];
    userThreeId = idThree as User["id"];

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

        if (message.event === WebSocketEvent.GroupCreated) {
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
      const message: GroupCreatedSnsMessage = {
        groupMemberIds: [ userOneId, userThreeId ],
        group: {
          id: "convo-group-123",
          name: "test group",
          image: "test-image",
          createdBy: userOneId,
          createdAt: mockDate,
        },
      };

      await sns.publish({
        TopicArn: groupCreatedSnsTopicArn,
        Message: JSON.stringify(message),
      }).promise();

      // Wait until all the expected messages arrive
      await Promise.all([
        backoff(() => Promise.resolve(connections.userOneA.messages), (arr) => arr.length > 0),
        backoff(() => Promise.resolve(connections.userOneB.messages), (arr) => arr.length > 0),
        backoff(() => Promise.resolve(connections.userThree.messages), (arr) => arr.length > 0),
      ]);

      // Assert that they have the right structure
      expect(connections.userOneA.messages.length).toBe(1);
      expect(connections.userOneA.messages[0]).toEqual({
        event: WebSocketEvent.GroupCreated,
        data: { group: message.group },
      });

      expect(connections.userOneB.messages.length).toBe(1);
      expect(connections.userOneB.messages[0]).toEqual({
        event: WebSocketEvent.GroupCreated,
        data: { group: message.group },
      });

      expect(connections.userThree.messages[0]).toEqual({
        event: WebSocketEvent.GroupCreated,
        data: { group: message.group },
      });

      expect(connections.userTwo.messages.length).toBe(0);
    });
  });
});
