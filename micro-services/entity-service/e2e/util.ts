/* eslint-disable no-console */
import { Role } from "@yac/core";
import ksuid from "ksuid";
import { documentClient, cognito, generateRandomString } from "../../../e2e/util";
import { ConversationType } from "../src/enums/conversationType.enum";
import { EntityType } from "../src/enums/entityType.enum";
import { KeyPrefix } from "../src/enums/keyPrefix.enum";
import { RawConversation } from "../src/repositories/conversation.dynamo.repository";
import { RawConversationUserRelationship } from "../src/repositories/conversationUserRelationship.dynamo.repository";
import { RawTeam } from "../src/repositories/team.dynamo.repository";
import { RawTeamUserRelationship } from "../src/repositories/teamUserRelationship.dynamo.repository";
import { ConversationId } from "../src/types/conversationId.type";
import { FriendConvoId } from "../src/types/friendConvoId.type";
import { GroupId } from "../src/types/groupId.type";
import { MeetingId } from "../src/types/meetingId.type";
import { TeamId } from "../src/types/teamId.type";
import { UserId } from "../src/types/userId.type";

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

    const teamId = `${KeyPrefix.Team}${ksuid.randomSync().string}` as TeamId;

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

    const conversationId = `${KeyPrefix.FriendConversation}${[ userId, friendId ].sort().join("-")}` as FriendConvoId;

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

    const conversationId = `${KeyPrefix.GroupConversation}${ksuid.randomSync().string}` as GroupId;

    const conversation: RawConversation = {
      entityType: EntityType.GroupConversation,
      pk: conversationId,
      sk: conversationId,
      gsi1pk: teamId,
      gsi1sk: teamId && conversationId,
      id: conversationId,
      type: ConversationType.Group,
      createdAt: new Date().toISOString(),
      teamId,
      name,
      createdBy,
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

    const conversationId = `${KeyPrefix.MeetingConversation}${ksuid.randomSync().string}` as MeetingId;

    const conversation: RawConversation = {
      entityType: EntityType.GroupConversation,
      pk: conversationId,
      sk: conversationId,
      gsi1pk: teamId,
      gsi1sk: teamId && conversationId,
      id: conversationId,
      type: ConversationType.Group,
      createdAt: new Date().toISOString(),
      dueDate,
      teamId,
      name,
      createdBy,
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
    const { userId, conversationId, role } = params;

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
      gsi1sk: `${KeyPrefix.Time}${updatedAt}` as `${KeyPrefix.Time}${string}`,
      gsi2pk: userId,
      gsi2sk: `${KeyPrefix.Time}${convoPrefix}${updatedAt}` as `${KeyPrefix.Time}${KeyPrefix.FriendConversation | KeyPrefix.GroupConversation | KeyPrefix.MeetingConversation}${string}`,
      conversationId,
      userId,
      updatedAt,
      role,
      muted: false,
    };

    await documentClient.put({
      TableName: process.env["core-table-name"] as string,
      Item: conversationUserRelationship,
    }).promise();

    return { conversationUserRelationship };
  } catch (error) {
    console.log("Error in getConversation:\n", error);

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
