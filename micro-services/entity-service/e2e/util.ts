/* eslint-disable no-console */
import { Role } from "@yac/core";
import ksuid from "ksuid";
import { DynamoDB } from "aws-sdk";
import { documentClient, cognito, generateRandomString } from "../../../e2e/util";
import { ConversationType } from "../src/enums/conversationType.enum";
import { EntityType } from "../src/enums/entityType.enum";
import { KeyPrefix } from "../src/enums/keyPrefix.enum";
import { RawConversation } from "../src/repositories/conversation.dynamo.repository";
import { RawConversationUserRelationship } from "../src/repositories/conversationUserRelationship.dynamo.repository";
import { RawTeam } from "../src/repositories/team.dynamo.repository";
import { RawTeamUserRelationship } from "../src/repositories/teamUserRelationship.dynamo.repository";
import { RawMessage } from "../src/repositories/message.dynamo.repository";
import { ConversationId } from "../src/types/conversationId.type";
import { FriendConvoId } from "../src/types/friendConvoId.type";
import { GroupId } from "../src/types/groupId.type";
import { MeetingId } from "../src/types/meetingId.type";
import { TeamId } from "../src/types/teamId.type";
import { UserId } from "../src/types/userId.type";
import { MessageId } from "../src/types/messageId.type";
import { MimeType } from "../src/enums/mimeType.enum";
import { PendingMessageId } from "../src/types/pendingMessageId.type";
import { RawPendingMessage } from "../src/repositories/pendingMessage.dynamo.repository";
import { RawUser } from "../src/repositories/user.dynamo.repository";

export async function createRandomUser(): Promise<CreateRandomUserOutput> {
  try {
    const email = `${generateRandomString(8)}@${generateRandomString(8)}.com`;

    const userId: UserId = `${KeyPrefix.User}${ksuid.randomSync().string}`;

    const user: RawUser = {
      entityType: EntityType.User,
      pk: userId,
      sk: userId,
      id: userId,
      email,
    };

    await documentClient.put({
      TableName: process.env["core-table-name"] as string,
      Item: user,
    }).promise();

    return { user };
  } catch (error) {
    console.log("Error in createRandomUser:\n", error);

    throw error;
  }
}
export async function deleteUser(id: UserId): Promise<void> {
  try {
    const { Item } = await documentClient.get({
      TableName: process.env["core-table-name"] as string,
      Key: { pk: id, sk: id },
    }).promise();

    if (Item) {
      await Promise.all([
        cognito.adminDeleteUser({
          UserPoolId: process.env["user-pool-id"] as string,
          Username: (Item as Record<string, string>).email,
        }).promise(),
        documentClient.delete({
          TableName: process.env["core-table-name"] as string,
          Key: { pk: id, sk: id },
        }).promise(),
      ]);
    }
  } catch (error) {
    console.log("Error in deleteUser:\n", error);

    throw error;
  }
}

export async function createRandomTeam(params: CreateRandomTeamInput): Promise<CreateRandomTeamOutput> {
  try {
    const { createdBy } = params;

    const teamId: TeamId = `${KeyPrefix.Team}${ksuid.randomSync().string}`;

    const team: RawTeam = {
      entityType: EntityType.Team,
      pk: teamId,
      sk: teamId,
      id: teamId,
      name: generateRandomString(5),
      createdBy,
    };

    await documentClient.put({
      TableName: process.env["core-table-name"] as string,
      Item: team,
    }).promise();

    return { team };
  } catch (error) {
    console.log("Error in createRandomTeam:\n", error);

    throw error;
  }
}

export async function getTeam(params: GetTeamInput): Promise<GetTeamOutput> {
  try {
    const { teamId } = params;

    const { Item } = await documentClient.get({
      TableName: process.env["core-table-name"] as string,
      Key: { pk: teamId, sk: teamId },
    }).promise();

    const team = Item as RawTeam;

    return { team };
  } catch (error) {
    console.log("Error in getTeam:\n", error);

    throw error;
  }
}

export async function createTeamUserRelationship(params: CreateTeamUserRelationshipInput): Promise<CreateTeamUserRelationshipOutput> {
  try {
    const { userId, teamId, role } = params;

    const teamUserRelationship: RawTeamUserRelationship = {
      entityType: EntityType.TeamUserRelationship,
      pk: teamId,
      sk: userId,
      gsi1pk: userId,
      gsi1sk: teamId,
      teamId,
      userId,
      role,
    };

    await documentClient.put({
      TableName: process.env["core-table-name"] as string,
      Item: teamUserRelationship,
    }).promise();

    return { teamUserRelationship };
  } catch (error) {
    console.log("Error in createTeamUserRelationship:\n", error);

    throw error;
  }
}

export async function getTeamUserRelationship(params: GetTeamUserRelationshipInput): Promise<GetTeamUserRelationshipOutput> {
  try {
    const { teamId, userId } = params;

    const { Item } = await documentClient.get({
      TableName: process.env["core-table-name"] as string,
      Key: { pk: teamId, sk: userId },
    }).promise();

    const teamUserRelationship = Item as RawTeamUserRelationship;

    return { teamUserRelationship };
  } catch (error) {
    console.log("Error in getTeamUserRelationship:\n", error);

    throw error;
  }
}

export async function createFriendConversation(params: CreateFriendConversationInput): Promise<CreateFriendConversationOutput> {
  try {
    const { userId, friendId } = params;

    const conversationId: FriendConvoId = `${KeyPrefix.FriendConversation}${[ userId, friendId ].sort().join("-")}`;

    const conversation: RawConversation = {
      entityType: EntityType.FriendConversation,
      pk: conversationId,
      sk: conversationId,
      id: conversationId,
      type: ConversationType.Friend,
      createdAt: new Date().toISOString(),
    };

    await documentClient.put({
      TableName: process.env["core-table-name"] as string,
      Item: conversation,
    }).promise();

    return { conversation };
  } catch (error) {
    console.log("Error in createFriendConversation:\n", error);

    throw error;
  }
}

export async function createGroupConversation(params: CreateGroupConversationInput): Promise<CreateGroupConversationOutput> {
  try {
    const { name, createdBy, teamId } = params;

    const conversationId: GroupId = `${KeyPrefix.GroupConversation}${ksuid.randomSync().string}`;

    const conversation: RawConversation = {
      entityType: EntityType.GroupConversation,
      pk: conversationId,
      sk: conversationId,
      gsi1pk: teamId,
      gsi1sk: teamId && conversationId,
      id: conversationId,
      type: ConversationType.Group,
      createdAt: new Date().toISOString(),
      name,
      createdBy,
      ...(teamId && { teamId }),
    };

    await documentClient.put({
      TableName: process.env["core-table-name"] as string,
      Item: conversation,
    }).promise();

    return { conversation };
  } catch (error) {
    console.log("Error in createFriendConversation:\n", error);

    throw error;
  }
}

export async function createMeetingConversation(params: CreateMeetingConversationInput): Promise<CreateMeetingConversationOutput> {
  try {
    const { name, createdBy, teamId, dueDate } = params;

    const conversationId: MeetingId = `${KeyPrefix.MeetingConversation}${ksuid.randomSync().string}`;

    const conversation: RawConversation = {
      entityType: EntityType.MeetingConversation,
      pk: conversationId,
      sk: conversationId,
      gsi1pk: teamId,
      gsi1sk: teamId && conversationId,
      id: conversationId,
      type: ConversationType.Meeting,
      createdAt: new Date().toISOString(),
      dueDate,
      name,
      createdBy,
      ...(teamId && { teamId }),
    };

    await documentClient.put({
      TableName: process.env["core-table-name"] as string,
      Item: conversation,
    }).promise();

    return { conversation };
  } catch (error) {
    console.log("Error in createFriendConversation:\n", error);

    throw error;
  }
}

export async function getConversation(params: GetConversationInput): Promise<GetConversationOutput> {
  try {
    const { conversationId } = params;

    const { Item } = await documentClient.get({
      TableName: process.env["core-table-name"] as string,
      Key: { pk: conversationId, sk: conversationId },
    }).promise();

    const conversation = Item as RawConversation;

    return { conversation };
  } catch (error) {
    console.log("Error in getConversation:\n", error);

    throw error;
  }
}

export async function createConversationUserRelationship(params: CreateConversationUserRelationshipInput): Promise<CreateConversationUserRelationshipOutput> {
  try {
    const { userId, conversationId, role, dueDate, recentMessageId, unreadMessageIds = [] } = params;

    const updatedAt = new Date().toISOString();

    // eslint-disable-next-line no-nested-ternary
    const convoPrefix = conversationId.startsWith(KeyPrefix.FriendConversation) ? KeyPrefix.FriendConversation
      : conversationId.startsWith(KeyPrefix.GroupConversation) ? KeyPrefix.GroupConversation
        : KeyPrefix.MeetingConversation;

    const conversationUserRelationship: RawConversationUserRelationship = {
      entityType: EntityType.ConversationUserRelationship,
      pk: conversationId,
      sk: userId,
      gsi1pk: userId,
      gsi1sk: `${KeyPrefix.Time}${updatedAt}`,
      gsi2pk: userId,
      gsi2sk: `${KeyPrefix.Time}${convoPrefix}${updatedAt}`,
      conversationId,
      userId,
      updatedAt,
      role,
      muted: false,
      ...(recentMessageId && { recentMessageId }),
      ...(dueDate && { gsi3pk: userId }),
      ...(dueDate && { gsi3sk: `${KeyPrefix.Time}${dueDate}` }),
      ...(unreadMessageIds.length && { unreadMessages: documentClient.createSet(unreadMessageIds) }),
    };

    await documentClient.put({
      TableName: process.env["core-table-name"] as string,
      Item: conversationUserRelationship,
    }).promise();

    return { conversationUserRelationship };
  } catch (error) {
    console.log("Error in createConversationUserRelationship:\n", error);

    throw error;
  }
}

export async function getConversationUserRelationship(params: GetConversationUserRelationshipInput): Promise<GetConversationUserRelationshipOutput> {
  try {
    const { conversationId, userId } = params;

    const { Item } = await documentClient.get({
      TableName: process.env["core-table-name"] as string,
      Key: { pk: conversationId, sk: userId },
    }).promise();

    const conversationUserRelationship = Item as RawConversationUserRelationship;

    return { conversationUserRelationship };
  } catch (error) {
    console.log("Error in getConversationUserRelationship:\n", error);

    throw error;
  }
}

export async function createMessage(params: CreateMessageInput): Promise<CreateMessageOutput> {
  try {
    const { from, conversationId, conversationMemberIds, mimeType, replyTo, markSeenByAll, reactions = {}, replyCount = 0 } = params;

    const messageId = `${replyTo ? KeyPrefix.Reply : KeyPrefix.Message}${ksuid.randomSync().string}` as MessageId;

    const timestamp = new Date().toISOString();

    const seenAt = conversationMemberIds.reduce((acc: { [key: string]: string | null; }, memberId) => {
      acc[memberId] = memberId === from || markSeenByAll ? timestamp : null;

      return acc;
    }, {});

    const rawReactions = Object.entries(reactions).reduce((acc: Record<string, DynamoDB.DocumentClient.DynamoDbSet>, entry) => {
      const [ reaction, userIds ] = entry;

      acc[reaction] = documentClient.createSet(userIds);

      return acc;
    }, {});

    const message: RawMessage = {
      entityType: EntityType.Message,
      pk: messageId,
      sk: messageId,
      gsi1pk: conversationId,
      gsi1sk: messageId,
      id: messageId,
      conversationId,
      from,
      createdAt: timestamp,
      seenAt,
      reactions: rawReactions,
      mimeType,
      replyCount,
      ...(replyTo && { gsi2pk: replyTo }),
      ...(replyTo && { gsi2sk: messageId }),
      ...(replyTo && { replyTo }),
    };

    await documentClient.put({
      TableName: process.env["core-table-name"] as string,
      Item: message,
    }).promise();

    return { message };
  } catch (error) {
    console.log("Error in createMessage:\n", error);

    throw error;
  }
}

export async function getMessage(params: GetMessageInput): Promise<GetMessageOutput> {
  try {
    const { messageId } = params;

    const { Item } = await documentClient.get({
      TableName: process.env["core-table-name"] as string,
      Key: { pk: messageId, sk: messageId },
    }).promise();

    const message = Item as RawMessage;

    return { message };
  } catch (error) {
    console.log("Error in getMessage:\n", error);

    throw error;
  }
}

export async function getPendingMessage(params: GetPendingMessageInput): Promise<GetPendingMessageOutput> {
  try {
    const { pendingMessageId } = params;

    const { Item } = await documentClient.get({
      TableName: process.env["core-table-name"] as string,
      Key: { pk: pendingMessageId, sk: pendingMessageId },
    }).promise();

    const pendingMessage = Item as RawPendingMessage;

    return { pendingMessage };
  } catch (error) {
    console.log("Error in getMessage:\n", error);

    throw error;
  }
}

export interface CreateRandomUserOutput {
  user: RawUser;
}

export interface CreateRandomTeamInput {
  createdBy: UserId;
}

export interface CreateRandomTeamOutput {
  team: RawTeam;
}

export interface GetTeamInput {
  teamId: TeamId;
}

export interface GetTeamOutput {
  team?: RawTeam;
}

export interface CreateTeamUserRelationshipInput {
  userId: UserId;
  teamId: TeamId;
  role: Role;
}

export interface CreateTeamUserRelationshipOutput {
  teamUserRelationship: RawTeamUserRelationship;
}

export interface GetTeamUserRelationshipInput {
  userId: UserId;
  teamId: TeamId;
}

export interface GetTeamUserRelationshipOutput {
  teamUserRelationship?: RawTeamUserRelationship;
}

export interface CreateFriendConversationInput {
  userId: UserId;
  friendId: UserId;
}

export interface CreateFriendConversationOutput {
  conversation: RawConversation;
}

export interface CreateGroupConversationInput {
  createdBy: UserId;
  name: string;
  teamId?: TeamId;
}

export interface CreateGroupConversationOutput {
  conversation: RawConversation;
}

export interface CreateMeetingConversationInput {
  createdBy: UserId;
  name: string;
  dueDate: string;
  teamId?: TeamId;
}

export interface CreateMeetingConversationOutput {
  conversation: RawConversation;
}

export interface GetConversationInput {
  conversationId: ConversationId;
}

export interface GetConversationOutput {
  conversation?: RawConversation;
}

export interface CreateConversationUserRelationshipInput {
  userId: UserId;
  conversationId: ConversationId;
  role: Role;
  dueDate?: string;
  recentMessageId?: MessageId;
  unreadMessageIds?: MessageId[];
}

export interface CreateConversationUserRelationshipOutput {
  conversationUserRelationship: RawConversationUserRelationship;
}

export interface GetConversationUserRelationshipInput {
  userId: UserId;
  conversationId: ConversationId;
}

export interface GetConversationUserRelationshipOutput {
  conversationUserRelationship?: RawConversationUserRelationship;
}

export interface CreateMessageInput {
  from: UserId;
  conversationId: ConversationId;
  conversationMemberIds: UserId[];
  mimeType: MimeType;
  reactions?: Record<string, UserId[]>
  replyTo?: MessageId;
  replyCount?: number;
  markSeenByAll?: boolean;
}

export interface CreateMessageOutput {
  message: RawMessage;
}

export interface GetMessageInput {
  messageId: MessageId;
}

export interface GetMessageOutput {
  message?: RawMessage;
}

export interface GetPendingMessageInput {
  pendingMessageId: PendingMessageId;
}

export interface GetPendingMessageOutput {
  pendingMessage?: RawPendingMessage;
}
