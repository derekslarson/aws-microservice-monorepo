/* eslint-disable no-await-in-loop */
/* eslint-disable no-console */
import { BadRequestError, MakeRequired, Role } from "@yac/util";
import { randomDigits } from "crypto-secure-random-digit";
import ksuid from "ksuid";
import { DynamoDB, S3 } from "aws-sdk";
import identicon from "jdenticon";
import { DocumentClient } from "aws-sdk/lib/dynamodb/document_client";
import { documentClient, cognito, s3, generateRandomString } from "../../../e2e/util";
import { ConversationType as ConversationTypeEnum } from "../src/enums/conversationType.enum";
import { ConversationType } from "../src/types/conversationType.type";
import { EntityType } from "../src/enums/entityType.enum";
import { KeyPrefix } from "../src/enums/keyPrefix.enum";
import { Conversation, FriendConversation, GroupConversation, MeetingConversation, RawConversation } from "../src/repositories/conversation.dynamo.repository";
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
import { MessageMimeType } from "../src/enums/message.mimeType.enum";
import { PendingMessageId } from "../src/types/pendingMessageId.type";
import { RawPendingMessage } from "../src/repositories/pendingMessage.dynamo.repository";
import { RawUser } from "../src/repositories/user.dynamo.repository";
import { ImageMimeType } from "../src/enums/image.mimeType.enum";
import { UniqueProperty } from "../src/enums/uniqueProperty.enum";
import { RawUniqueProperty } from "../src/repositories/uniqueProperty.dynamo.repository";

function createDefaultImage(): CreateDefaultImageOutput {
  try {
    identicon.configure({
      hues: [ 48 ],
      lightness: {
        color: [ 0.40, 0.69 ],
        grayscale: [ 0.47, 0.90 ],
      },
      saturation: {
        color: 1.00,
        grayscale: 0.00,
      },
      backColor: "#fff",
    });

    const image = identicon.toPng(ksuid.randomSync().toString(), 100);

    return { image, mimeType: ImageMimeType.Png };
  } catch (error) {
    console.log("Error in createDefaultImage:\n", error);

    throw error;
  }
}

export function generateRandomEmail(): string {
  return `${generateRandomString(8)}@${generateRandomString(8)}.com`;
}

export function generateRandomPhone(): string {
  return `+1${randomDigits(10).join("")}`;
}

export async function getUniqueProperty(params: GetUniquePropertyInput): Promise<GetUniquePropertyOutput> {
  try {
    const { property, value } = params;

    const { Item } = await documentClient.get({
      TableName: process.env["core-table-name"] as string,
      Key: { pk: property, sk: value },
    }).promise();

    return { uniqueProperty: Item as RawUniqueProperty | undefined };
  } catch (error) {
    console.log("Error in getUniqueProperty:\n", error);

    throw error;
  }
}

export async function isUniqueEmail(params: IsUniqueEmailInput): Promise<IsUniqueEmailOutput> {
  try {
    const { email } = params;

    const { Item } = await documentClient.get({
      TableName: process.env["core-table-name"] as string,
      Key: { pk: UniqueProperty.Email, sk: email },
    }).promise();

    return { isUniqueEmail: !Item };
  } catch (error) {
    console.log("Error in isUniqueEmail:\n", error);

    throw error;
  }
}

export async function isUniqueUsername(params: IsUniqueUsernameInput): Promise<IsUniqueUsernameOutput> {
  try {
    const { username } = params;

    const { Item } = await documentClient.get({
      TableName: process.env["core-table-name"] as string,
      Key: { pk: UniqueProperty.Username, sk: username },
    }).promise();

    return { isUniqueUsername: !Item };
  } catch (error) {
    console.log("Error in isUniqueUsername:\n", error);

    throw error;
  }
}

export async function isUniquePhone(params: IsUniquePhoneInput): Promise<IsUniquePhoneOutput> {
  try {
    const { phone } = params;

    const { Item } = await documentClient.get({
      TableName: process.env["core-table-name"] as string,
      Key: { pk: UniqueProperty.Phone, sk: phone },
    }).promise();

    return { isUniquePhone: !Item };
  } catch (error) {
    console.log("Error in isUniquePhone:\n", error);

    throw error;
  }
}

export async function createUniqueProperty(params: CreateUniquePropertyInput): Promise<CreateUniquePropertyOutput> {
  try {
    const { property, value, userId } = params;

    const uniqueProperty: RawUniqueProperty = {
      entityType: EntityType.UniqueProperty,
      pk: property,
      sk: value,
      property,
      value,
      userId,
    };

    await documentClient.put({
      TableName: process.env["core-table-name"] as string,
      Item: uniqueProperty,
    }).promise();

    return { uniqueProperty };
  } catch (error) {
    console.log("Error in createTeamUserRelationship:\n", error);

    throw error;
  }
}

export async function createUser(params: CreateUserInput): Promise<CreateUserOutput> {
  try {
    const { email, realName, username, phone, bio } = params;

    const [
      { isUniqueEmail: isUniqueEmailVal },
      { isUniqueUsername: isUniqueUsernameVal },
      { isUniquePhone: isUniquePhoneVal },
    ] = await Promise.all([
      isUniqueEmail({ email }),
      isUniqueUsername({ username }),
      phone ? isUniquePhone({ phone }) : Promise.resolve({ isUniquePhone: true }),
    ]);

    if (!isUniqueEmailVal) {
      throw new BadRequestError("email is not unique");
    }

    if (!isUniqueUsernameVal) {
      throw new BadRequestError("username is not unique");
    }

    if (!isUniquePhoneVal) {
      throw new BadRequestError("phone is not unique");
    }

    const { image, mimeType } = createDefaultImage();

    const userId: UserId = `${KeyPrefix.User}${ksuid.randomSync().string}`;

    const user: MakeRequired<RawUser, "email" | "username" | "realName"> = {
      entityType: EntityType.User,
      imageMimeType: mimeType,
      pk: userId,
      sk: userId,
      id: userId,
      email,
      username,
      phone,
      realName,
      bio,
    };

    const s3UploadInput: S3.Types.PutObjectRequest = {
      Bucket: process.env["image-s3-bucket-name"] as string,
      Key: `users/${userId}.png`,
      Body: image,
      ContentType: mimeType,
    };

    const dynamoPutInput: DocumentClient.PutItemInput = {
      TableName: process.env["core-table-name"] as string,
      Item: user,
    };

    await Promise.all([
      s3.upload(s3UploadInput).promise(),
      documentClient.put(dynamoPutInput).promise(),
      createUniqueProperty({ property: UniqueProperty.Email, value: email, userId }),
      createUniqueProperty({ property: UniqueProperty.Username, value: username, userId }),
      phone ? createUniqueProperty({ property: UniqueProperty.Phone, value: phone, userId }) : null,
    ]);

    return { user };
  } catch (error) {
    console.log("Error in createRandomUser:\n", error);

    throw error;
  }
}

export async function createRandomUser(): Promise<CreateRandomUserOutput> {
  try {
    const realName = generateRandomString(8);
    const bio = generateRandomString(8);

    let email = generateRandomEmail();
    let username = generateRandomString(8);
    let phone = generateRandomPhone();

    let isUniqueEmailVal: boolean;
    let isUniqueUsernameVal: boolean;
    let isUniquePhoneVal: boolean;

    ([
      { isUniqueEmail: isUniqueEmailVal },
      { isUniqueUsername: isUniqueUsernameVal },
      { isUniquePhone: isUniquePhoneVal },
    ] = await Promise.all([
      isUniqueEmail({ email }),
      isUniqueUsername({ username }),
      isUniquePhone({ phone }),
    ]));

    while (!isUniqueEmailVal) {
      email = generateRandomEmail();
      ({ isUniqueEmail: isUniqueEmailVal } = await isUniqueEmail({ email }));
    }

    while (!isUniqueUsernameVal) {
      username = generateRandomString(8);
      ({ isUniqueUsername: isUniqueUsernameVal } = await isUniqueUsername({ username }));
    }

    while (!isUniquePhoneVal) {
      phone = generateRandomPhone();
      ({ isUniquePhone: isUniquePhoneVal } = await isUniquePhone({ phone }));
    }

    const { image, mimeType } = createDefaultImage();

    const userId: UserId = `${KeyPrefix.User}${ksuid.randomSync().string}`;

    const user: MakeRequired<RawUser, "email" | "username" | "realName" | "bio"> = {
      entityType: EntityType.User,
      imageMimeType: mimeType,
      pk: userId,
      sk: userId,
      id: userId,
      email,
      username,
      phone,
      realName,
      bio,
    };

    const s3UploadInput: S3.Types.PutObjectRequest = {
      Bucket: process.env["image-s3-bucket-name"] as string,
      Key: `users/${userId}.png`,
      Body: image,
      ContentType: mimeType,
    };

    const dynamoPutInput: DocumentClient.PutItemInput = {
      TableName: process.env["core-table-name"] as string,
      Item: user,
    };

    await Promise.all([
      s3.upload(s3UploadInput).promise(),
      documentClient.put(dynamoPutInput).promise(),
      createUniqueProperty({ property: UniqueProperty.Email, value: email, userId }),
      createUniqueProperty({ property: UniqueProperty.Username, value: username, userId }),
      createUniqueProperty({ property: UniqueProperty.Phone, value: phone, userId }),
    ]);

    return { user };
  } catch (error) {
    console.log("Error in createRandomUser:\n", error);

    throw error;
  }
}

export async function getUser(params: GetUserInput): Promise<GetUserOutput> {
  try {
    const { userId } = params;

    const { Item } = await documentClient.get({
      TableName: process.env["core-table-name"] as string,
      Key: { pk: userId, sk: userId },
    }).promise();

    const user = Item as RawUser;

    return { user };
  } catch (error) {
    console.log("Error in getUser:\n", error);

    throw error;
  }
}

export async function getUserByEmail(params: GetUserByEmailInput): Promise<GetUserByEmailOutput> {
  try {
    const { email } = params;

    let user: MakeRequired<RawUser, "email"> | undefined;

    const { Item } = await documentClient.get({
      TableName: process.env["core-table-name"] as string,
      Key: { pk: UniqueProperty.Email, sk: email },
    }).promise();

    const uniqueProperty = Item as RawUniqueProperty;

    if (uniqueProperty) {
      const { Item: ItemTwo } = await documentClient.get({
        TableName: process.env["core-table-name"] as string,
        Key: { pk: uniqueProperty.userId, sk: uniqueProperty.userId },
      }).promise();

      user = ItemTwo as MakeRequired<RawUser, "email">;
    }

    return { user };
  } catch (error) {
    console.log("Error in getUserByEmail:\n", error);

    throw error;
  }
}

export async function getUserByPhone(params: GetUserByPhoneInput): Promise<GetUserByPhoneOutput> {
  try {
    const { phone } = params;

    let user: MakeRequired<RawUser, "phone"> | undefined;

    const { Item } = await documentClient.get({
      TableName: process.env["core-table-name"] as string,
      Key: { pk: UniqueProperty.Phone, sk: phone },
    }).promise();

    const uniqueProperty = Item as RawUniqueProperty;

    if (uniqueProperty) {
      const { Item: ItemTwo } = await documentClient.get({
        TableName: process.env["core-table-name"] as string,
        Key: { pk: uniqueProperty.userId, sk: uniqueProperty.userId },
      }).promise();

      user = ItemTwo as MakeRequired<RawUser, "phone">;
    }

    return { user };
  } catch (error) {
    console.log("Error in getUserByPhone:\n", error);

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

    const { image, mimeType } = createDefaultImage();

    const teamId: TeamId = `${KeyPrefix.Team}${ksuid.randomSync().string}`;

    const team: RawTeam = {
      entityType: EntityType.Team,
      imageMimeType: mimeType,
      pk: teamId,
      sk: teamId,
      id: teamId,
      name: generateRandomString(5),
      createdBy,
    };

    const s3UploadInput: S3.Types.PutObjectRequest = {
      Bucket: process.env["image-s3-bucket-name"] as string,
      Key: `teams/${teamId}.png`,
      Body: image,
      ContentType: mimeType,
    };

    const dynamoPutInput: DocumentClient.PutItemInput = {
      TableName: process.env["core-table-name"] as string,
      Item: team,
    };

    await Promise.all([
      s3.upload(s3UploadInput).promise(),
      documentClient.put(dynamoPutInput).promise(),
    ]);

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

    const conversation: RawConversation<FriendConversation> = {
      entityType: EntityType.FriendConversation,
      pk: conversationId,
      sk: conversationId,
      id: conversationId,
      type: ConversationTypeEnum.Friend,
      createdAt: new Date().toISOString(),
      createdBy: userId,
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

    const { image, mimeType } = createDefaultImage();

    const conversationId: GroupId = `${KeyPrefix.GroupConversation}${ksuid.randomSync().string}`;

    const conversation: RawConversation<GroupConversation> = {
      entityType: EntityType.GroupConversation,
      imageMimeType: mimeType,
      pk: conversationId,
      sk: conversationId,
      gsi1pk: teamId,
      gsi1sk: teamId && conversationId,
      id: conversationId,
      type: ConversationTypeEnum.Group,
      createdAt: new Date().toISOString(),
      name,
      createdBy,
      ...(teamId && { teamId }),
    };

    const s3UploadInput: S3.Types.PutObjectRequest = {
      Bucket: process.env["image-s3-bucket-name"] as string,
      Key: `groups/${conversationId}.png`,
      Body: image,
      ContentType: mimeType,
    };

    const dynamoPutInput: DocumentClient.PutItemInput = {
      TableName: process.env["core-table-name"] as string,
      Item: conversation,
    };

    await Promise.all([
      s3.upload(s3UploadInput).promise(),
      documentClient.put(dynamoPutInput).promise(),
    ]);

    return { conversation };
  } catch (error) {
    console.log("Error in createFriendConversation:\n", error);

    throw error;
  }
}

export async function createMeetingConversation(params: CreateMeetingConversationInput): Promise<CreateMeetingConversationOutput> {
  try {
    const { name, createdBy, teamId, dueDate } = params;

    const { image, mimeType } = createDefaultImage();

    const conversationId: MeetingId = `${KeyPrefix.MeetingConversation}${ksuid.randomSync().string}`;

    const conversation: RawConversation<MeetingConversation> = {
      entityType: EntityType.MeetingConversation,
      imageMimeType: mimeType,
      pk: conversationId,
      sk: conversationId,
      gsi1pk: teamId,
      gsi1sk: teamId && conversationId,
      id: conversationId,
      type: ConversationTypeEnum.Meeting,
      createdAt: new Date().toISOString(),
      dueDate,
      name,
      createdBy,
      ...(teamId && { teamId }),
    };

    const s3UploadInput: S3.Types.PutObjectRequest = {
      Bucket: process.env["image-s3-bucket-name"] as string,
      Key: `meetings/${conversationId}.png`,
      Body: image,
      ContentType: mimeType,
    };

    const dynamoPutInput: DocumentClient.PutItemInput = {
      TableName: process.env["core-table-name"] as string,
      Item: conversation,
    };

    await Promise.all([
      s3.upload(s3UploadInput).promise(),
      documentClient.put(dynamoPutInput).promise(),
    ]);

    return { conversation };
  } catch (error) {
    console.log("Error in createFriendConversation:\n", error);

    throw error;
  }
}

export async function getConversation<T extends ConversationId>(params: GetConversationInput<T>): Promise<GetConversationOutput<T>> {
  try {
    const { conversationId } = params;

    const { Item } = await documentClient.get({
      TableName: process.env["core-table-name"] as string,
      Key: { pk: conversationId, sk: conversationId },
    }).promise();

    const conversation = Item as RawConversation<Conversation<ConversationType<T>>>;

    return { conversation };
  } catch (error) {
    console.log("Error in getConversation:\n", error);

    throw error;
  }
}

export async function createConversationUserRelationship<T extends ConversationType>(params: CreateConversationUserRelationshipInput<T>): Promise<CreateConversationUserRelationshipOutput<T>> {
  try {
    const { type, userId, conversationId, role, dueDate, recentMessageId, unreadMessageIds = [] } = params;

    const updatedAt = new Date().toISOString();

    // eslint-disable-next-line no-nested-ternary
    const convoPrefix = conversationId.startsWith(KeyPrefix.FriendConversation) ? KeyPrefix.FriendConversation
      : conversationId.startsWith(KeyPrefix.GroupConversation) ? KeyPrefix.GroupConversation
        : KeyPrefix.MeetingConversation;

    const conversationUserRelationship: RawConversationUserRelationship<T> = {
      entityType: EntityType.ConversationUserRelationship,
      pk: conversationId,
      sk: userId,
      gsi1pk: userId,
      gsi1sk: `${KeyPrefix.Time}${updatedAt}`,
      gsi2pk: userId,
      gsi2sk: `${KeyPrefix.Time}${convoPrefix}${updatedAt}`,
      type,
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

export async function getConversationUserRelationship<T extends ConversationId>(params: GetConversationUserRelationshipInput<T>): Promise<GetConversationUserRelationshipOutput<T>> {
  try {
    const { conversationId, userId } = params;

    const { Item } = await documentClient.get({
      TableName: process.env["core-table-name"] as string,
      Key: { pk: conversationId, sk: userId },
    }).promise();

    const conversationUserRelationship = Item as RawConversationUserRelationship<ConversationType<T>>;

    return { conversationUserRelationship };
  } catch (error) {
    console.log("Error in getConversationUserRelationship:\n", error);

    throw error;
  }
}

export async function createMessage(params: CreateMessageInput): Promise<CreateMessageOutput> {
  try {
    const { from, conversationId, conversationMemberIds, mimeType, replyTo, markSeenByAll, title, transcript = "", reactions = {}, replyCount = 0 } = params;

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
      transcript,
      title,
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

export async function createPendingMessage(params: CreatePendingMessageInput): Promise<CreatePendingMessageOutput> {
  try {
    const { conversationId, from, mimeType } = params;

    const pendingMessageId: PendingMessageId = `${KeyPrefix.PendingMessage}${ksuid.randomSync().string}`;

    const pendingMessage: RawPendingMessage = {
      entityType: EntityType.PendingMessage,
      pk: pendingMessageId,
      sk: pendingMessageId,
      id: pendingMessageId,
      createdAt: new Date().toISOString(),
      conversationId,
      from,
      mimeType,
    };

    await documentClient.put({
      TableName: process.env["core-table-name"] as string,
      Item: pendingMessage,
    }).promise();

    return { pendingMessage };
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

export async function getSnsEventsByTopicArn<T extends Record<string, unknown> = Record<string, unknown>>(params: GetSnsEventsByTopicArnInput): Promise<GetSnsEventsByTopicArnOutput<T>> {
  try {
    const { topicArn } = params;

    const { Items } = await documentClient.query({
      TableName: process.env["core-testing-sns-event-table-name"] as string,
      KeyConditionExpression: "#pk = :pk",
      ExpressionAttributeNames: { "#pk": "pk" },
      ExpressionAttributeValues: { ":pk": topicArn },
    }).promise();

    const snsEvents = Items as SnsEvent<T>[];

    return { snsEvents };
  } catch (error) {
    console.log("Error in getSnsEventsByTopicArn:\n", error);

    throw error;
  }
}

export async function deleteSnsEventsByTopicArn(params: DeleteSnsEventsByTopicArnInput): Promise<DeleteSnsEventsByTopicArnOutput> {
  try {
    const { topicArn } = params;

    const { snsEvents } = await getSnsEventsByTopicArn({ topicArn });

    await Promise.all(snsEvents.map((snsEvent) => documentClient.delete({
      TableName: process.env["core-testing-sns-event-table-name"] as string,
      Key: {
        pk: snsEvent.pk,
        sk: snsEvent.sk,
      },
    }).promise()));
  } catch (error) {
    console.log("Error in deleteSnsEventsByTopicArn:\n", error);

    throw error;
  }
}

export interface CreateUniquePropertyInput {
  property: UniqueProperty;
  value: string;
  userId: UserId;
}

export interface CreateUniquePropertyOutput {
  uniqueProperty: RawUniqueProperty;
}

export interface GetUniquePropertyInput {
  property: UniqueProperty;
  value: string;
}

export interface GetUniquePropertyOutput {
  uniqueProperty?: RawUniqueProperty;
}

export interface CreateUserInput {
  email: string;
  username: string;
  realName: string;
  phone?: string;
  bio?: string;
}

export interface CreateUserOutput {
  user: MakeRequired<RawUser, "email" | "username" | "realName">;
}

export interface CreateRandomUserOutput {
  user: MakeRequired<RawUser, "email" | "username" | "realName" | "bio">;
}

export interface CreateRandomTeamInput {
  createdBy: UserId;
}

export interface CreateRandomTeamOutput {
  team: RawTeam;
}

export interface GetUserInput {
  userId: UserId;
}

export interface GetUserOutput {
  user?: RawUser;
}

export interface GetUserByEmailInput {
  email: string;
}

export interface GetUserByEmailOutput {
  user?: MakeRequired<RawUser, "email">;
}

export interface GetUserByPhoneInput {
  phone: string;
}

export interface GetUserByPhoneOutput {
  user?: MakeRequired<RawUser, "phone">;
}

export interface IsUniqueEmailInput {
  email: string;
}

export interface IsUniqueEmailOutput {
  isUniqueEmail: boolean;
}

export interface IsUniqueUsernameInput {
  username: string;
}

export interface IsUniqueUsernameOutput {
  isUniqueUsername: boolean;
}

export interface IsUniquePhoneInput {
  phone: string;
}

export interface IsUniquePhoneOutput {
  isUniquePhone: boolean;
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
  conversation: RawConversation<FriendConversation>;
}

export interface CreateGroupConversationInput {
  createdBy: UserId;
  name: string;
  teamId?: TeamId;
}

export interface CreateGroupConversationOutput {
  conversation: RawConversation<GroupConversation>;
}

export interface CreateMeetingConversationInput {
  createdBy: UserId;
  name: string;
  dueDate: string;
  teamId?: TeamId;
}

export interface CreateMeetingConversationOutput {
  conversation: RawConversation<MeetingConversation>;
}

export interface GetConversationInput<T extends ConversationId> {
  conversationId: T;
}

export interface GetConversationOutput<T extends ConversationId> {
  conversation?: RawConversation<Conversation<ConversationType<T>>>;
}

export interface CreateConversationUserRelationshipInput<T extends ConversationType> {
  type: T;
  userId: UserId;
  conversationId: ConversationId<T>;
  role: Role;
  dueDate?: string;
  recentMessageId?: MessageId;
  unreadMessageIds?: MessageId[];
}

export interface CreateConversationUserRelationshipOutput<T extends ConversationType> {
  conversationUserRelationship: RawConversationUserRelationship<T>;
}

export interface GetConversationUserRelationshipInput<T extends ConversationId> {
  userId: UserId;
  conversationId: T;
}

export interface GetConversationUserRelationshipOutput<T extends ConversationId> {
  conversationUserRelationship?: RawConversationUserRelationship<ConversationType<T>>;
}

export interface CreateMessageInput {
  from: UserId;
  conversationId: ConversationId;
  conversationMemberIds: UserId[];
  mimeType: MessageMimeType;
  transcript?: string;
  reactions?: Record<string, UserId[]>
  replyTo?: MessageId;
  title?: string;
  replyCount?: number;
  markSeenByAll?: boolean;
}

export interface CreateMessageOutput {
  message: RawMessage;
}

export interface CreatePendingMessageInput {
  from: UserId;
  conversationId: ConversationId;
  mimeType: MessageMimeType;
}

export interface CreatePendingMessageOutput {
  pendingMessage: RawPendingMessage;
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

export interface CreateDefaultImageOutput {
  image: Buffer;
  mimeType: ImageMimeType.Png;
}

export interface GetSnsEventsByTopicArnInput {
  topicArn: string;
}

interface SnsEvent<T extends Record<string, unknown>> {
  // topicArn
  pk: string;
  // messageId
  sk: string;
  topicArn: string;
  message: T;
}
export interface GetSnsEventsByTopicArnOutput<T extends Record<string, unknown>> {
  snsEvents: SnsEvent<T>[];
}

export interface DeleteSnsEventsByTopicArnInput {
  topicArn: string;
}

export type DeleteSnsEventsByTopicArnOutput = void;
