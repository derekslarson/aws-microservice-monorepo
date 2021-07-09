/* eslint-disable no-console */
import { Role } from "@yac/core/lib/src/enums";
import ksuid from "ksuid";
import { documentClient, cognito, generateRandomString } from "../../../e2e/util";
import { EntityType } from "../src/enums/entityType.enum";
import { KeyPrefix } from "../src/enums/keyPrefix.enum";
import { RawTeam } from "../src/repositories/team.dynamo.repository";
import { RawTeamUserRelationship } from "../src/repositories/teamUserRelationship.dynamo.repository";
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
    console.log("Error in createRandomTeam:\n", error);

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
    console.log("Error in createRandomTeam:\n", error);

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
    console.log("Error in createRandomTeam:\n", error);

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
