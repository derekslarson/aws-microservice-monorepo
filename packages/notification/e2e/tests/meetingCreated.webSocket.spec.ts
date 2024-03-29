/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import WebSocket from "ws";
import { MeetingCreatedSnsMessage } from "@yac/util";
import { backoff, createRandomAuthServiceUser, getAccessTokenByEmail, sns } from "../../../../e2e/util";
import { WebSocketEvent } from "../../src/enums/webSocket.event.enum";
import { MeetingCreatedWebSocketMessage } from "../../src/models/websocket-messages/meetingCreated.websocket.message";
import { UserId } from "../../../core/src/types/userId.type";

describe("Meeting Created (WebSocket Event)", () => {
  const webSocketUrl = process.env.webSocketUrl as string;
  const meetingCreatedSnsTopicArn = process.env["meeting-created-sns-topic-arn"] as string;
  let userOneId: UserId;

  const connections: Record<string, { messages: MeetingCreatedWebSocketMessage[], instance: null | WebSocket }> = {
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
  };

  beforeAll(async () => {
    // Create two users in cognito
    const [ { email: emailOne, id: idOne }, { email: emailTwo } ] = await Promise.all([
      createRandomAuthServiceUser(),
      createRandomAuthServiceUser(),
    ]);

    userOneId = idOne as UserId;

    // Get JWT tokens for each user
    const [ { accessToken: accessTokenOne }, { accessToken: accessTokenTwo } ] = await Promise.all([
      getAccessTokenByEmail(emailOne),
      getAccessTokenByEmail(emailTwo),
    ]);

    // Establish connections for both users (two different connections for userOne)
    connections.userOneA.instance = new WebSocket(`${webSocketUrl}?token=${accessTokenOne}`);
    connections.userOneB.instance = new WebSocket(`${webSocketUrl}?token=${accessTokenOne}`);
    connections.userTwo.instance = new WebSocket(`${webSocketUrl}?token=${accessTokenTwo}`);

    // Wait for them all to successfully connect, and add the 'onMessage' handlers to push messages to their respective arrays
    await Promise.all(Object.keys(connections).map((connectionName) => new Promise((resolve, reject) => {
      const instance: WebSocket = connections[connectionName].instance as WebSocket;

      instance.on("error", (error) => reject(error));
      instance.on("open", (event: unknown) => resolve(event));
      instance.on("message", (event) => {
        const message = JSON.parse(event as string);

        if (message.event === WebSocketEvent.MeetingCreated) {
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
      const message: MeetingCreatedSnsMessage = {
        meetingMemberIds: [ userOneId ],
        meeting: {
          id: "meeting_123",
          name: "test meeting",
          image: "test-image",
          createdBy: userOneId,
          dueDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      };

      await sns.publish({
        TopicArn: meetingCreatedSnsTopicArn,
        Message: JSON.stringify(message),
      }).promise();

      // Wait until all the expected messages arrive
      await Promise.all([
        backoff(() => Promise.resolve(connections.userOneA.messages), (arr) => arr.length > 0),
        backoff(() => Promise.resolve(connections.userOneB.messages), (arr) => arr.length > 0),
      ]);

      // Assert that they have the right structure
      expect(connections.userOneA.messages.length).toBe(1);
      expect(connections.userOneA.messages[0]).toEqual({
        event: WebSocketEvent.MeetingCreated,
        data: { meeting: message.meeting },
      });

      expect(connections.userOneB.messages.length).toBe(1);
      expect(connections.userOneB.messages[0]).toEqual({
        event: WebSocketEvent.MeetingCreated,
        data: { meeting: message.meeting },
      });

      expect(connections.userTwo.messages.length).toBe(0);
    });
  });
});
