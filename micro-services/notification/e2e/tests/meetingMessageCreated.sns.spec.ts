/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { MeetingMessageCreatedSnsMessage } from "@yac/util";
import { backoff, createRandomCognitoUser, sns } from "../../../../e2e/util";
import { WebSocketEvent } from "../../src/enums/webSocket.event.enum";
import { createWebSocketListener, deleteSnsEventsByTopicArn, getSnsEventsByTopicArn, registerMockDevice, RegisterMockDeviceOutput, WebSocketListener } from "../util";

describe("Meeting Message Created SNS Topic", () => {
  const meetingMessageCreatedSnsTopicArn = process.env["meeting-message-created-sns-topic-arn"] as string;
  const pushNotificationFailedSnsTopicArn = process.env["push-notification-failed-sns-topic-arn"] as string;
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
            createWebSocketListener({ userId: userOneId, eventType: WebSocketEvent.MeetingMessageCreated }),
            createWebSocketListener({ userId: userOneId, eventType: WebSocketEvent.MeetingMessageCreated }),
            createWebSocketListener({ userId: userTwoId, eventType: WebSocketEvent.MeetingMessageCreated }),
            createWebSocketListener({ userId: userThreeId, eventType: WebSocketEvent.MeetingMessageCreated }),
          ]));
        });

        beforeEach(() => {
          userOneAWebSocketListener.clearMessages();
          userOneBWebSocketListener.clearMessages();
          userTwoWebSocketListener.clearMessages();
          userThreeWebSocketListener.clearMessages();
        });

        it("sends valid websocket events to the correct connectionIds", async () => {
          const message: MeetingMessageCreatedSnsMessage = {
            meetingMemberIds: [ userOneId, userTwoId ],
            message: {
              id: "message-id",
              to: {
                id: "convo-meeting-id",
                name: "mock-name",
                image: "mock-image",
                createdBy: "user-mock-id",
                createdAt: new Date().toISOString(),
                dueDate: new Date().toISOString(),
              },
              from: {
                id: userTwoId,
                image: "test-image-two",
              },
              type: "meeting",
              createdAt: new Date().toISOString(),
              seenAt: { [userOneId]: new Date().toISOString() },
              reactions: {},
              replyCount: 0,
              title: "mock-title",
              mimeType: "audio/mpeg",
              fetchUrl: "mock-fetch-url",
            },
          };

          await sns.publish({
            TopicArn: meetingMessageCreatedSnsTopicArn,
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
            event: WebSocketEvent.MeetingMessageCreated,
            data: { message: message.message },
          });

          expect(userOneBWebSocketListener.messages.length).toBe(1);
          expect(userOneBWebSocketListener.messages[0]).toEqual({
            event: WebSocketEvent.MeetingMessageCreated,
            data: { message: message.message },
          });

          expect(userTwoWebSocketListener.messages.length).toBe(1);
          expect(userTwoWebSocketListener.messages[0]).toEqual({
            event: WebSocketEvent.MeetingMessageCreated,
            data: { message: message.message },
          });

          expect(userThreeWebSocketListener.messages.length).toBe(0);
        });
      });

      describe("push notifications", () => {
        let userOneAMockDevice: RegisterMockDeviceOutput;
        let userOneBMockDevice: RegisterMockDeviceOutput;

        beforeAll(async () => {
          ([ userOneAMockDevice, userOneBMockDevice ] = await Promise.all([
            registerMockDevice({ userId: userOneId }),
            registerMockDevice({ userId: userOneId }),
            registerMockDevice({ userId: userTwoId }),
            registerMockDevice({ userId: userThreeId }),
          ]));
        });

        beforeEach(async () => {
          // clear the sns events table so the test can have a clean slate
          await deleteSnsEventsByTopicArn({ topicArn: pushNotificationFailedSnsTopicArn });
        });

        it("sends valid push notification events to the correct device tokens", async () => {
          const message: MeetingMessageCreatedSnsMessage = {
            meetingMemberIds: [ userOneId, userTwoId ],
            message: {
              id: "message-id",
              to: {
                id: "convo-meeting-id",
                name: "mock-name",
                image: "mock-image",
                createdBy: "user-mock-id",
                createdAt: new Date().toISOString(),
                dueDate: new Date().toISOString(),
              },
              from: {
                id: userTwoId,
                image: "test-image-two",
              },
              type: "meeting",
              createdAt: new Date().toISOString(),
              seenAt: { [userOneId]: new Date().toISOString() },
              reactions: {},
              replyCount: 0,
              title: "mock-title",
              mimeType: "audio/mpeg",
              fetchUrl: "mock-fetch-url",
            },
          };

          await sns.publish({
            TopicArn: meetingMessageCreatedSnsTopicArn,
            Message: JSON.stringify(message),
          }).promise();

          // We are sending to mock tokens that aren't registered with FCM.
          // If we get back an InvalidPlatformToken failure, it means everything about
          // the push notification was valid, but that it was to an invalid token.
          // Therefore, we just need to check that there are errors like this for the users
          // we expect to get a push notification
          const { snsEvents } = await backoff(
            () => getSnsEventsByTopicArn({ topicArn: pushNotificationFailedSnsTopicArn }),
            (response) => response.snsEvents.length === 2,
          );

          expect(snsEvents.length).toBe(2);

          expect(snsEvents).toContain(jasmine.objectContaining({
            message: jasmine.objectContaining({
              FailureType: "InvalidPlatformToken",
              EndpointArn: userOneAMockDevice.endpointArn,
            }),
          }));

          expect(snsEvents).toContain(jasmine.objectContaining({
            message: jasmine.objectContaining({
              FailureType: "InvalidPlatformToken",
              EndpointArn: userOneBMockDevice.endpointArn,
            }),
          }));
        });
      });
    });
  });
});
