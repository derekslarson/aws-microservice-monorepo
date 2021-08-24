/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { FriendMessageCreatedSnsMessage } from "@yac/util";
import { backoff, createRandomCognitoUser, sns } from "../../../../e2e/util";
import { WebSocketEvent } from "../../src/enums/webSocket.event.enum";
import { createPushNotificationListener, createWebSocketListener, PushNotificationListener, WebSocketListener } from "../util";
import { PushNotificationEvent } from "../../src/enums/pushNotification.event.enum";

describe("Friend Message Created SNS Topic", () => {
  const friendMessageCreatedSnsTopicArn = process.env["friend-message-created-sns-topic-arn"] as string;
  let userOneId: `user-${string}`;
  let userTwoId: `user-${string}`;
  let userThreeId: `user-${string}`;

  beforeAll(async () => {
    // Create three users in cognito
    ([ { id: userOneId }, { id: userTwoId }, { id: userThreeId } ] = await Promise.all([
      createRandomCognitoUser(),
      createRandomCognitoUser(),
      createRandomCognitoUser(),
    ]));
  });

  describe("under normal conditions", () => {
    describe("when a message is published to the sns topic", () => {
      describe("web sockets", () => {
        let userOneAWebSocketListener: WebSocketListener;
        let userOneBWebSocketListener: WebSocketListener;
        let userTwoWebSocketListener: WebSocketListener;
        let userThreeWebSocketListener: WebSocketListener;

        beforeAll(async () => {
          ([
            userOneAWebSocketListener,
            userOneBWebSocketListener,
            userTwoWebSocketListener,
            userThreeWebSocketListener,
          ] = await Promise.all([
            createWebSocketListener({ userId: userOneId, eventType: WebSocketEvent.FriendMessageCreated }),
            createWebSocketListener({ userId: userOneId, eventType: WebSocketEvent.FriendMessageCreated }),
            createWebSocketListener({ userId: userTwoId, eventType: WebSocketEvent.FriendMessageCreated }),
            createWebSocketListener({ userId: userThreeId, eventType: WebSocketEvent.FriendMessageCreated }),
          ]));
        });

        beforeEach(() => {
          userOneAWebSocketListener.clearMessages();
          userOneBWebSocketListener.clearMessages();
          userTwoWebSocketListener.clearMessages();
          userThreeWebSocketListener.clearMessages();
        });

        it("sends valid websocket events to the correct connectionIds", async () => {
          const message: FriendMessageCreatedSnsMessage = {
            to: {
              id: userOneId,
              image: "test-image-one",
            },
            from: {
              id: userTwoId,
              image: "test-image-two",
              realName: "User Two",
            },
            message: {
              id: "message-id",
              to: userOneId,
              from: userTwoId,
              type: "friend",
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
            TopicArn: friendMessageCreatedSnsTopicArn,
            Message: JSON.stringify(message),
          }).promise();

          // Wait until all the expected messages arrive
          await Promise.all([
            backoff(() => Promise.resolve(userOneAWebSocketListener.messages), (arr) => arr.length > 0),
            backoff(() => Promise.resolve(userOneBWebSocketListener.messages), (arr) => arr.length > 0),
            backoff(() => Promise.resolve(userTwoWebSocketListener.messages), (arr) => arr.length > 0),
          ]);

          // Assert that they have the right structure
          expect(userOneAWebSocketListener.messages.length).toBe(1);
          expect(userOneAWebSocketListener.messages[0]).toEqual({
            event: WebSocketEvent.FriendMessageCreated,
            data: {
              to: message.to,
              from: message.from,
              message: message.message,
            },
          });

          expect(userOneBWebSocketListener.messages.length).toBe(1);
          expect(userOneBWebSocketListener.messages[0]).toEqual({
            event: WebSocketEvent.FriendMessageCreated,
            data: {
              to: message.to,
              from: message.from,
              message: message.message,
            },
          });
        });
      });

      describe("push notifications", () => {
        let userOneAPushNotificationListener: PushNotificationListener;
        let userOneBPushNotificationListener: PushNotificationListener;
        let userTwoPushNotificationListener: PushNotificationListener;
        let userThreePushNotificationListener: PushNotificationListener;

        beforeAll(async () => {
          ([
            userOneAPushNotificationListener,
            userOneBPushNotificationListener,
            userTwoPushNotificationListener,
            userThreePushNotificationListener,
          ] = await Promise.all([
            createPushNotificationListener({ userId: userOneId, eventType: PushNotificationEvent.FriendMessageCreated }),
            createPushNotificationListener({ userId: userOneId, eventType: PushNotificationEvent.FriendMessageCreated }),
            createPushNotificationListener({ userId: userTwoId, eventType: PushNotificationEvent.FriendMessageCreated }),
            createPushNotificationListener({ userId: userThreeId, eventType: PushNotificationEvent.FriendMessageCreated }),
          ]));
        });

        beforeEach(() => {
          userOneAPushNotificationListener.clearNotifications();
          userOneBPushNotificationListener.clearNotifications();
          userTwoPushNotificationListener.clearNotifications();
          userThreePushNotificationListener.clearNotifications();
        });

        it("sends valid push notification events to the correct device tokens", async () => {
          const message: FriendMessageCreatedSnsMessage = {
            to: {
              id: userOneId,
              image: "test-image-one",
            },
            from: {
              id: userTwoId,
              image: "test-image-two",
              realName: "User Two",
            },
            message: {
              id: "message-id",
              to: userOneId,
              from: userTwoId,
              type: "friend",
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
            TopicArn: friendMessageCreatedSnsTopicArn,
            Message: JSON.stringify(message),
          }).promise();

          // Wait until all the expected messages arrive
          await Promise.all([
            backoff(() => Promise.resolve(userOneAPushNotificationListener.notifications), (arr) => arr.length > 0), 8000,
            backoff(() => Promise.resolve(userOneBPushNotificationListener.notifications), (arr) => arr.length > 0), 8000,
          ]);

          // Assert that they have the right structure
          expect(userOneAPushNotificationListener.notifications.length).toBe(1);
          expect(userOneAPushNotificationListener.notifications[0]).toEqual(jasmine.objectContaining({
            data: { event: PushNotificationEvent.FriendMessageCreated },
            notification: { title: "New Message Received", body: `Message from ${message.from.realName as string}` },
          }));

          expect(userOneBPushNotificationListener.notifications.length).toBe(1);
          expect(userOneBPushNotificationListener.notifications[0]).toEqual(jasmine.objectContaining({
            data: { event: PushNotificationEvent.FriendMessageCreated },
            notification: { title: "New Message Received", body: `Message from ${message.from.realName as string}` },
          }));

          expect(userTwoPushNotificationListener.notifications.length).toBe(0);
          expect(userThreePushNotificationListener.notifications.length).toBe(0);
        });
      });
    });
  });
});
