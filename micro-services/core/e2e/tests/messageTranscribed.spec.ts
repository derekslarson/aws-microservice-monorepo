/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { GroupMessageCreatedSnsMessage, MeetingMessageCreatedSnsMessage, MessageTranscribedSnsMessage, Role } from "@yac/util";
import { backoff, documentClient, generateRandomString, ISO_DATE_REGEX, sns, URL_REGEX } from "../../../../e2e/util";
import { ConversationType } from "../../src/enums/conversationType.enum";
import { EntityType } from "../../src/enums/entityType.enum";
import { KeyPrefix } from "../../src/enums/keyPrefix.enum";
import { MessageMimeType } from "../../src/enums/message.mimeType.enum";
import { FriendConversation, GroupConversation, MeetingConversation, RawConversation } from "../../src/repositories/conversation.dynamo.repository";
import { RawConversationUserRelationship } from "../../src/repositories/conversationUserRelationship.dynamo.repository";
import { RawPendingMessage } from "../../src/repositories/pendingMessage.dynamo.repository";
import { MessageId } from "../../src/types/messageId.type";
import { UserId } from "../../src/types/userId.type";
import {
  createRandomUser,
  CreateRandomUserOutput,
  createConversationUserRelationship,
  createGroupConversation,
  createPendingMessage,
  getMessage,
  getPendingMessage,
  getConversationUserRelationship,
  deleteSnsEventsByTopicArn,
  getUser,
  getSnsEventsByTopicArn,
  createMeetingConversation,
  createFriendConversation,
} from "../util";

fdescribe("Message Transcribed SNS Topic", () => {
  const userId = process.env.userId as UserId;
  const messageTranscribedSnsTopicArn = process.env["message-transcribed-sns-topic-arn"] as string;
  const mockTranscript = "mock-transcript";
  const mockMimeType = MessageMimeType.AudioMp3;

  describe("under normal conditions", () => {
    describe("when a message is published to the SNS topic", () => {
      describe("when the message is a friend message", () => {
        const friendMessageCreatedSnsTopicArn = process.env["friend-message-created-sns-topic-arn"] as string;

        let toUser: CreateRandomUserOutput["user"];
        let friendship: RawConversation<FriendConversation>;
        let conversationUserRelationship: RawConversationUserRelationship<ConversationType.Friend>;
        let conversationUserRelationshipTwo: RawConversationUserRelationship<ConversationType.Friend>;
        let pendingMessage: RawPendingMessage;
        let messageId: MessageId;

        beforeEach(async () => {
          ({ user: toUser } = await createRandomUser());
          ({ conversation: friendship } = await createFriendConversation({ userId, friendId: toUser.id }));

          ([ { conversationUserRelationship }, { conversationUserRelationship: conversationUserRelationshipTwo }, { pendingMessage } ] = await Promise.all([
            createConversationUserRelationship({ type: ConversationType.Friend, conversationId: friendship.id, userId, role: Role.Admin }),
            createConversationUserRelationship({ type: ConversationType.Friend, conversationId: friendship.id, userId: toUser.id, role: Role.Admin }),
            createPendingMessage({ conversationId: friendship.id, from: userId, mimeType: mockMimeType }),
          ]));

          messageId = pendingMessage.id.replace(KeyPrefix.PendingMessage, KeyPrefix.Message) as MessageId;
        });

        it("creates a valid Message entity", async () => {
          try {
            const snsMessage: MessageTranscribedSnsMessage = {
              messageId,
              transcript: mockTranscript,
            };

            await sns.publish({
              TopicArn: messageTranscribedSnsTopicArn,
              Message: JSON.stringify(snsMessage),
            }).promise();

            const { message } = await backoff(() => getMessage({ messageId }), (res) => !!res.message);

            expect(message).toEqual({
              entityType: EntityType.Message,
              pk: messageId,
              sk: messageId,
              gsi1pk: friendship.id,
              gsi1sk: messageId,
              id: messageId,
              mimeType: mockMimeType,
              transcript: mockTranscript,
              createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
              conversationId: friendship.id,
              seenAt: {
                [userId]: jasmine.stringMatching(ISO_DATE_REGEX),
                [toUser.id]: null,
              },
              reactions: {},
              from: userId,
              replyCount: 0,
            });
          } catch (error) {
            fail(error);
          }
        });

        it("deletes the PendingMessage entity", async () => {
          try {
            const snsMessage: MessageTranscribedSnsMessage = {
              messageId,
              transcript: mockTranscript,
            };

            await sns.publish({
              TopicArn: messageTranscribedSnsTopicArn,
              Message: JSON.stringify(snsMessage),
            }).promise();

            const { pendingMessage: pendingMessageThatShouldntExist } = await backoff(() => getPendingMessage({ pendingMessageId: pendingMessage.id }), (res) => !res.pendingMessage);

            expect(pendingMessageThatShouldntExist).not.toBeDefined();
          } catch (error) {
            fail(error);
          }
        });

        it("updates the conversation members' ConversationUserRelationship entities", async () => {
          try {
            const snsMessage: MessageTranscribedSnsMessage = {
              messageId,
              transcript: mockTranscript,
            };

            await sns.publish({
              TopicArn: messageTranscribedSnsTopicArn,
              Message: JSON.stringify(snsMessage),
            }).promise();

            const [
              { conversationUserRelationship: conversationUserRelationshipUpdated },
              { conversationUserRelationship: conversationUserRelationshipTwoUpdated },
            ] = await Promise.all([
              backoff(() => getConversationUserRelationship({ userId, conversationId: friendship.id }), (res) => res.conversationUserRelationship?.updatedAt !== conversationUserRelationship.updatedAt),
              backoff(() => getConversationUserRelationship({ userId: toUser.id, conversationId: friendship.id }), (res) => !!res.conversationUserRelationship?.unreadMessages),
            ]);

            expect(conversationUserRelationshipUpdated?.updatedAt).toEqual(jasmine.stringMatching(ISO_DATE_REGEX));
            expect(conversationUserRelationshipUpdated?.updatedAt).not.toEqual(conversationUserRelationship.updatedAt);

            expect(conversationUserRelationshipUpdated?.gsi1sk).toEqual(jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)));
            expect(conversationUserRelationshipUpdated?.gsi1sk).not.toEqual(conversationUserRelationship.gsi1sk);

            expect(conversationUserRelationshipUpdated?.gsi2sk).toEqual(jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.FriendConversation}.*`)));
            expect(conversationUserRelationshipUpdated?.gsi2sk).not.toEqual(conversationUserRelationship.gsi2sk);

            expect(conversationUserRelationshipUpdated?.unreadMessages).toEqual(conversationUserRelationship.unreadMessages);

            expect(conversationUserRelationshipTwoUpdated?.updatedAt).toEqual(jasmine.stringMatching(ISO_DATE_REGEX));
            expect(conversationUserRelationshipTwoUpdated?.updatedAt).not.toEqual(conversationUserRelationshipTwo.updatedAt);

            expect(conversationUserRelationshipTwoUpdated?.gsi1sk).toEqual(jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)));
            expect(conversationUserRelationshipTwoUpdated?.gsi1sk).not.toEqual(conversationUserRelationshipTwo.gsi1sk);

            expect(conversationUserRelationshipTwoUpdated?.gsi2sk).toEqual(jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.FriendConversation}.*`)));
            expect(conversationUserRelationshipTwoUpdated?.gsi2sk).not.toEqual(conversationUserRelationshipTwo.gsi2sk);

            expect(conversationUserRelationshipTwoUpdated?.unreadMessages).toEqual(documentClient.createSet([ messageId ]));
          } catch (error) {
            fail(error);
          }
        });

        it("publishes a valid SNS message", async () => {
        // clear the sns events table so the test can have a clean slate
          await deleteSnsEventsByTopicArn({ topicArn: friendMessageCreatedSnsTopicArn });

          try {
            const snsMessage: MessageTranscribedSnsMessage = {
              messageId,
              transcript: mockTranscript,
            };

            await sns.publish({
              TopicArn: messageTranscribedSnsTopicArn,
              Message: JSON.stringify(snsMessage),
            }).promise();

            const [ { user: fromUser }, { message } ] = await Promise.all([
              backoff(() => getUser({ userId }), (res) => !!res.user),
              backoff(() => getMessage({ messageId }), (res) => !!res.message),
            ]);

            if (!fromUser || !message) {
              throw new Error("necessary records not created");
            }

            // wait till the events have been fired
            const { snsEvents } = await backoff(
              () => getSnsEventsByTopicArn<MeetingMessageCreatedSnsMessage>({ topicArn: friendMessageCreatedSnsTopicArn }),
              (response) => response.snsEvents.length === 1,
            );

            expect(snsEvents.length).toBe(1);

            expect(snsEvents).toEqual([
              jasmine.objectContaining({
                message: {
                  to: {
                    id: toUser.id,
                    email: toUser.email,
                    username: toUser.username,
                    phone: toUser.phone,
                    realName: toUser.realName,
                    image: jasmine.stringMatching(URL_REGEX),
                  },
                  from: {
                    id: fromUser.id,
                    email: fromUser.email,
                    username: fromUser.username,
                    phone: fromUser.phone,
                    realName: fromUser.realName,
                    image: jasmine.stringMatching(URL_REGEX),
                  },
                  message: {
                    id: message.id,
                    to: toUser.id,
                    from: message.from,
                    type: ConversationType.Friend,
                    createdAt: message.createdAt,
                    seenAt: message.seenAt,
                    reactions: message.reactions,
                    replyCount: 0,
                    mimeType: message.mimeType,
                    transcript: mockTranscript,
                    fetchUrl: jasmine.stringMatching(URL_REGEX),
                    fromImage: jasmine.stringMatching(URL_REGEX),
                  },
                },
              }),
            ]);
          } catch (error) {
            fail(error);
          }
        }, 45000);
      });

      describe("when the message is a group message", () => {
        const groupMessageCreatedSnsTopicArn = process.env["group-message-created-sns-topic-arn"] as string;

        let otherUser: CreateRandomUserOutput["user"];
        let group: RawConversation<GroupConversation>;
        let conversationUserRelationship: RawConversationUserRelationship<ConversationType.Group>;
        let conversationUserRelationshipTwo: RawConversationUserRelationship<ConversationType.Group>;
        let pendingMessage: RawPendingMessage;
        let messageId: MessageId;

        beforeEach(async () => {
          ([ { user: otherUser }, { conversation: group } ] = await Promise.all([
            createRandomUser(),
            createGroupConversation({ createdBy: userId, name: generateRandomString(5) }),
          ]));

          ([ { conversationUserRelationship }, { conversationUserRelationship: conversationUserRelationshipTwo }, { pendingMessage } ] = await Promise.all([
            createConversationUserRelationship({ type: ConversationType.Group, conversationId: group.id, userId, role: Role.Admin }),
            createConversationUserRelationship({ type: ConversationType.Group, conversationId: group.id, userId: otherUser.id, role: Role.User }),
            createPendingMessage({ conversationId: group.id, from: userId, mimeType: mockMimeType }),
          ]));

          messageId = pendingMessage.id.replace(KeyPrefix.PendingMessage, KeyPrefix.Message) as MessageId;
        });

        it("creates a valid Message entity", async () => {
          try {
            const snsMessage: MessageTranscribedSnsMessage = {
              messageId,
              transcript: mockTranscript,
            };

            await sns.publish({
              TopicArn: messageTranscribedSnsTopicArn,
              Message: JSON.stringify(snsMessage),
            }).promise();

            const { message } = await backoff(() => getMessage({ messageId }), (res) => !!res.message);

            expect(message).toEqual({
              entityType: EntityType.Message,
              pk: messageId,
              sk: messageId,
              gsi1pk: group.id,
              gsi1sk: messageId,
              id: messageId,
              mimeType: mockMimeType,
              transcript: mockTranscript,
              createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
              conversationId: group.id,
              seenAt: {
                [userId]: jasmine.stringMatching(ISO_DATE_REGEX),
                [otherUser.id]: null,
              },
              reactions: {},
              from: userId,
              replyCount: 0,
            });
          } catch (error) {
            fail(error);
          }
        });

        it("deletes the PendingMessage entity", async () => {
          try {
            const snsMessage: MessageTranscribedSnsMessage = {
              messageId,
              transcript: mockTranscript,
            };

            await sns.publish({
              TopicArn: messageTranscribedSnsTopicArn,
              Message: JSON.stringify(snsMessage),
            }).promise();

            const { pendingMessage: pendingMessageThatShouldntExist } = await backoff(() => getPendingMessage({ pendingMessageId: pendingMessage.id }), (res) => !res.pendingMessage);

            expect(pendingMessageThatShouldntExist).not.toBeDefined();
          } catch (error) {
            fail(error);
          }
        });

        it("updates the conversation members' ConversationUserRelationship entities", async () => {
          try {
            const snsMessage: MessageTranscribedSnsMessage = {
              messageId,
              transcript: mockTranscript,
            };

            await sns.publish({
              TopicArn: messageTranscribedSnsTopicArn,
              Message: JSON.stringify(snsMessage),
            }).promise();

            const [
              { conversationUserRelationship: conversationUserRelationshipUpdated },
              { conversationUserRelationship: conversationUserRelationshipTwoUpdated },
            ] = await Promise.all([
              backoff(() => getConversationUserRelationship({ userId, conversationId: group.id }), (res) => res.conversationUserRelationship?.updatedAt !== conversationUserRelationship.updatedAt),
              backoff(() => getConversationUserRelationship({ userId: otherUser.id, conversationId: group.id }), (res) => !!res.conversationUserRelationship?.unreadMessages),
            ]);

            expect(conversationUserRelationshipUpdated?.updatedAt).toEqual(jasmine.stringMatching(ISO_DATE_REGEX));
            expect(conversationUserRelationshipUpdated?.updatedAt).not.toEqual(conversationUserRelationship.updatedAt);

            expect(conversationUserRelationshipUpdated?.gsi1sk).toEqual(jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)));
            expect(conversationUserRelationshipUpdated?.gsi1sk).not.toEqual(conversationUserRelationship.gsi1sk);

            expect(conversationUserRelationshipUpdated?.gsi2sk).toEqual(jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.GroupConversation}.*`)));
            expect(conversationUserRelationshipUpdated?.gsi2sk).not.toEqual(conversationUserRelationship.gsi2sk);

            expect(conversationUserRelationshipUpdated?.unreadMessages).toEqual(conversationUserRelationship.unreadMessages);

            expect(conversationUserRelationshipTwoUpdated?.updatedAt).toEqual(jasmine.stringMatching(ISO_DATE_REGEX));
            expect(conversationUserRelationshipTwoUpdated?.updatedAt).not.toEqual(conversationUserRelationshipTwo.updatedAt);

            expect(conversationUserRelationshipTwoUpdated?.gsi1sk).toEqual(jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)));
            expect(conversationUserRelationshipTwoUpdated?.gsi1sk).not.toEqual(conversationUserRelationshipTwo.gsi1sk);

            expect(conversationUserRelationshipTwoUpdated?.gsi2sk).toEqual(jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.GroupConversation}.*`)));
            expect(conversationUserRelationshipTwoUpdated?.gsi2sk).not.toEqual(conversationUserRelationshipTwo.gsi2sk);

            expect(conversationUserRelationshipTwoUpdated?.unreadMessages).toEqual(documentClient.createSet([ messageId ]));
          } catch (error) {
            fail(error);
          }
        });

        it("publishes a valid SNS message", async () => {
        // clear the sns events table so the test can have a clean slate
          await deleteSnsEventsByTopicArn({ topicArn: groupMessageCreatedSnsTopicArn });

          try {
            const snsMessage: MessageTranscribedSnsMessage = {
              messageId,
              transcript: mockTranscript,
            };

            await sns.publish({
              TopicArn: messageTranscribedSnsTopicArn,
              Message: JSON.stringify(snsMessage),
            }).promise();

            const [ { user: fromUser }, { message } ] = await Promise.all([
              backoff(() => getUser({ userId }), (res) => !!res.user),
              backoff(() => getMessage({ messageId }), (res) => !!res.message),
            ]);

            if (!fromUser || !message) {
              throw new Error("necessary records not created");
            }

            // wait till the events have been fired
            const { snsEvents } = await backoff(
              () => getSnsEventsByTopicArn<GroupMessageCreatedSnsMessage>({ topicArn: groupMessageCreatedSnsTopicArn }),
              (response) => response.snsEvents.length === 1,
            );

            expect(snsEvents.length).toBe(1);

            expect(snsEvents).toEqual([
              jasmine.objectContaining({
                message: {
                  groupMemberIds: jasmine.arrayContaining([ userId, otherUser.id ]),
                  to: {
                    id: group.id,
                    name: group.name,
                    createdBy: group.createdBy,
                    createdAt: group.createdAt,
                    image: jasmine.stringMatching(URL_REGEX),
                  },
                  from: {
                    id: fromUser.id,
                    email: fromUser.email,
                    username: fromUser.username,
                    phone: fromUser.phone,
                    realName: fromUser.realName,
                    image: jasmine.stringMatching(URL_REGEX),
                  },
                  message: {
                    id: message.id,
                    to: group.id,
                    from: message.from,
                    type: ConversationType.Group,
                    createdAt: message.createdAt,
                    seenAt: message.seenAt,
                    reactions: message.reactions,
                    replyCount: 0,
                    mimeType: message.mimeType,
                    transcript: mockTranscript,
                    fetchUrl: jasmine.stringMatching(URL_REGEX),
                    fromImage: jasmine.stringMatching(URL_REGEX),
                  },
                },
              }),
            ]);
          } catch (error) {
            fail(error);
          }
        }, 45000);
      });

      describe("when the message is a meeting message", () => {
        const meetingMessageCreatedSnsTopicArn = process.env["meeting-message-created-sns-topic-arn"] as string;

        let otherUser: CreateRandomUserOutput["user"];
        let meeting: RawConversation<MeetingConversation>;
        let conversationUserRelationship: RawConversationUserRelationship<ConversationType.Meeting>;
        let conversationUserRelationshipTwo: RawConversationUserRelationship<ConversationType.Meeting>;
        let pendingMessage: RawPendingMessage;
        let messageId: MessageId;

        beforeEach(async () => {
          ([ { user: otherUser }, { conversation: meeting } ] = await Promise.all([
            createRandomUser(),
            createMeetingConversation({ createdBy: userId, name: generateRandomString(5), dueDate: new Date().toISOString() }),
          ]));

          ([ { conversationUserRelationship }, { conversationUserRelationship: conversationUserRelationshipTwo }, { pendingMessage } ] = await Promise.all([
            createConversationUserRelationship({ type: ConversationType.Meeting, conversationId: meeting.id, userId, role: Role.Admin }),
            createConversationUserRelationship({ type: ConversationType.Meeting, conversationId: meeting.id, userId: otherUser.id, role: Role.User }),
            createPendingMessage({ conversationId: meeting.id, from: userId, mimeType: mockMimeType }),
          ]));

          messageId = pendingMessage.id.replace(KeyPrefix.PendingMessage, KeyPrefix.Message) as MessageId;
        });

        it("creates a valid Message entity", async () => {
          try {
            const snsMessage: MessageTranscribedSnsMessage = {
              messageId,
              transcript: mockTranscript,
            };

            await sns.publish({
              TopicArn: messageTranscribedSnsTopicArn,
              Message: JSON.stringify(snsMessage),
            }).promise();

            const { message } = await backoff(() => getMessage({ messageId }), (res) => !!res.message);

            expect(message).toEqual({
              entityType: EntityType.Message,
              pk: messageId,
              sk: messageId,
              gsi1pk: meeting.id,
              gsi1sk: messageId,
              id: messageId,
              mimeType: mockMimeType,
              transcript: mockTranscript,
              createdAt: jasmine.stringMatching(ISO_DATE_REGEX),
              conversationId: meeting.id,
              seenAt: {
                [userId]: jasmine.stringMatching(ISO_DATE_REGEX),
                [otherUser.id]: null,
              },
              reactions: {},
              from: userId,
              replyCount: 0,
            });
          } catch (error) {
            fail(error);
          }
        });

        it("deletes the PendingMessage entity", async () => {
          try {
            const snsMessage: MessageTranscribedSnsMessage = {
              messageId,
              transcript: mockTranscript,
            };

            await sns.publish({
              TopicArn: messageTranscribedSnsTopicArn,
              Message: JSON.stringify(snsMessage),
            }).promise();

            const { pendingMessage: pendingMessageThatShouldntExist } = await backoff(() => getPendingMessage({ pendingMessageId: pendingMessage.id }), (res) => !res.pendingMessage);

            expect(pendingMessageThatShouldntExist).not.toBeDefined();
          } catch (error) {
            fail(error);
          }
        });

        it("updates the conversation members' ConversationUserRelationship entities", async () => {
          try {
            const snsMessage: MessageTranscribedSnsMessage = {
              messageId,
              transcript: mockTranscript,
            };

            await sns.publish({
              TopicArn: messageTranscribedSnsTopicArn,
              Message: JSON.stringify(snsMessage),
            }).promise();

            const [
              { conversationUserRelationship: conversationUserRelationshipUpdated },
              { conversationUserRelationship: conversationUserRelationshipTwoUpdated },
            ] = await Promise.all([
              backoff(() => getConversationUserRelationship({ userId, conversationId: meeting.id }), (res) => res.conversationUserRelationship?.updatedAt !== conversationUserRelationship.updatedAt),
              backoff(() => getConversationUserRelationship({ userId: otherUser.id, conversationId: meeting.id }), (res) => !!res.conversationUserRelationship?.unreadMessages),
            ]);

            expect(conversationUserRelationshipUpdated?.updatedAt).toEqual(jasmine.stringMatching(ISO_DATE_REGEX));
            expect(conversationUserRelationshipUpdated?.updatedAt).not.toEqual(conversationUserRelationship.updatedAt);

            expect(conversationUserRelationshipUpdated?.gsi1sk).toEqual(jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)));
            expect(conversationUserRelationshipUpdated?.gsi1sk).not.toEqual(conversationUserRelationship.gsi1sk);

            expect(conversationUserRelationshipUpdated?.gsi2sk).toEqual(jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.MeetingConversation}.*`)));
            expect(conversationUserRelationshipUpdated?.gsi2sk).not.toEqual(conversationUserRelationship.gsi2sk);

            expect(conversationUserRelationshipUpdated?.unreadMessages).toEqual(conversationUserRelationship.unreadMessages);

            expect(conversationUserRelationshipTwoUpdated?.updatedAt).toEqual(jasmine.stringMatching(ISO_DATE_REGEX));
            expect(conversationUserRelationshipTwoUpdated?.updatedAt).not.toEqual(conversationUserRelationshipTwo.updatedAt);

            expect(conversationUserRelationshipTwoUpdated?.gsi1sk).toEqual(jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}.*`)));
            expect(conversationUserRelationshipTwoUpdated?.gsi1sk).not.toEqual(conversationUserRelationshipTwo.gsi1sk);

            expect(conversationUserRelationshipTwoUpdated?.gsi2sk).toEqual(jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.MeetingConversation}.*`)));
            expect(conversationUserRelationshipTwoUpdated?.gsi2sk).not.toEqual(conversationUserRelationshipTwo.gsi2sk);

            expect(conversationUserRelationshipTwoUpdated?.unreadMessages).toEqual(documentClient.createSet([ messageId ]));
          } catch (error) {
            fail(error);
          }
        });

        it("publishes a valid SNS message", async () => {
        // clear the sns events table so the test can have a clean slate
          await deleteSnsEventsByTopicArn({ topicArn: meetingMessageCreatedSnsTopicArn });

          try {
            const snsMessage: MessageTranscribedSnsMessage = {
              messageId,
              transcript: mockTranscript,
            };

            await sns.publish({
              TopicArn: messageTranscribedSnsTopicArn,
              Message: JSON.stringify(snsMessage),
            }).promise();

            const [ { user: fromUser }, { message } ] = await Promise.all([
              backoff(() => getUser({ userId }), (res) => !!res.user),
              backoff(() => getMessage({ messageId }), (res) => !!res.message),
            ]);

            if (!fromUser || !message) {
              throw new Error("necessary records not created");
            }

            // wait till the events have been fired
            const { snsEvents } = await backoff(
              () => getSnsEventsByTopicArn<MeetingMessageCreatedSnsMessage>({ topicArn: meetingMessageCreatedSnsTopicArn }),
              (response) => response.snsEvents.length === 1,
            );

            expect(snsEvents.length).toBe(1);

            expect(snsEvents).toEqual([
              jasmine.objectContaining({
                message: {
                  meetingMemberIds: jasmine.arrayContaining([ userId, otherUser.id ]),
                  to: {
                    id: meeting.id,
                    name: meeting.name,
                    createdBy: meeting.createdBy,
                    createdAt: meeting.createdAt,
                    dueDate: meeting.dueDate,
                    image: jasmine.stringMatching(URL_REGEX),
                  },
                  from: {
                    id: fromUser.id,
                    email: fromUser.email,
                    username: fromUser.username,
                    phone: fromUser.phone,
                    realName: fromUser.realName,
                    image: jasmine.stringMatching(URL_REGEX),
                  },
                  message: {
                    id: message.id,
                    to: meeting.id,
                    from: message.from,
                    type: ConversationType.Meeting,
                    createdAt: message.createdAt,
                    seenAt: message.seenAt,
                    reactions: message.reactions,
                    replyCount: 0,
                    mimeType: message.mimeType,
                    transcript: mockTranscript,
                    fetchUrl: jasmine.stringMatching(URL_REGEX),
                    fromImage: jasmine.stringMatching(URL_REGEX),
                  },
                },
              }),
            ]);
          } catch (error) {
            fail(error);
          }
        }, 45000);
      });
    });
  });
});
