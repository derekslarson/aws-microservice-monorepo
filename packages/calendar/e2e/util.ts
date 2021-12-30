import { UserId } from "@yac/util";
import { documentClient } from "../../../e2e/util";
import { EntityType } from "../src/enums/entityType.enum";
import { RawGoogleSettings } from "../src/repositories/google.settings.dynamo.repository";

export async function createGoogleSettings(params: CreateGoogleSettingsInput): Promise<CreateGoogleSettingsOutput> {
  try {
    const { userId, defaultCalendarId } = params;

    const googleSettings: RawGoogleSettings = {
      entityType: EntityType.GoogleSettings,
      pk: userId,
      sk: EntityType.GoogleSettings,
      userId,
      defaultCalendarId,
    };

    await documentClient.put({
      TableName: process.env["calendar-table-name"] as string,
      Item: googleSettings,
    }).promise();

    return { googleSettings };
  } catch (error) {
    console.log("Error in createGoogleSettings:\n", error);

    throw error;
  }
}

export async function getGoogleSettings(params: GetGoogleSettingsInput): Promise<GetGoogleSettingsOutput> {
  try {
    const { userId } = params;

    const { Item } = await documentClient.get({
      TableName: process.env["calendar-table-name"] as string,
      Key: { pk: userId, sk: EntityType.GoogleSettings },
    }).promise();

    const googleSettings = Item as RawGoogleSettings;

    return { googleSettings };
  } catch (error) {
    console.log("Error in getGoogleSettings:\n", error);

    throw error;
  }
}

export interface CreateGoogleSettingsInput {
  userId: UserId;
  defaultCalendarId?: string;
}

export interface CreateGoogleSettingsOutput {
  googleSettings: RawGoogleSettings;
}
export interface GetGoogleSettingsInput {
  userId: UserId;
}

export interface GetGoogleSettingsOutput {
  googleSettings?: RawGoogleSettings;
}
