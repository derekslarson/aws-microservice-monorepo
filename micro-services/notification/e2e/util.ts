/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import WebSocket from "ws";
import { register, listen, NotificationContent } from "push-receiver";
import { documentClient, getAccessToken, sns } from "../../../e2e/util";
import { EntityType } from "../src/enums/entityType.enum";
import { ListenerType } from "../src/enums/listenerType.enum";
import { WebSocketEvent } from "../src/enums/webSocket.event.enum";
import { PushNotificationEvent } from "../src/enums/pushNotification.event.enum";
import { RawListenerMapping } from "../src/repositories/listenerMapping.dynamo.repository";

export async function createListenerMapping(params: CreateListenerMappingInput): Promise<CreateListenerMappingOutput> {
  try {
    const { type, userId, value, valueTwo } = params;

    const listenerMapping: RawListenerMapping = {
      entityType: EntityType.ListenerMapping,
      pk: userId,
      sk: `${type}-${value}`,
      gsi1pk: `${type}-${value}`,
      gsi1sk: userId,
      type,
      userId,
      value,
      valueTwo,
    };

    await documentClient.put({
      TableName: process.env["listener-mapping-table-name"] as string,
      Item: listenerMapping,
    }).promise();

    return { listenerMapping };
  } catch (error) {
    console.log("Error in createTeamUserRelationship:\n", error);

    throw error;
  }
}

export async function getListenerMappingsByUserIdAndType(params: GetListenerMappingsByUserIdAndTypeInput): Promise<GetListenerMappingsByUserIdAndTypeOutput> {
  try {
    const { userId, type } = params;

    const { Items } = await documentClient.query({
      TableName: process.env["listener-mapping-table-name"] as string,
      KeyConditionExpression: "#pk = :userId AND begins_with(#sk, :type)",
      ExpressionAttributeNames: {
        "#pk": "pk",
        "#sk": "sk",
      },
      ExpressionAttributeValues: {
        ":userId": userId,
        ":type": `${type}-`,
      },
    }).promise();

    return { listenerMappings: Items as RawListenerMapping[] };
  } catch (error) {
    console.log("Error in getTeamUserRelationship:\n", error);

    throw error;
  }
}

export async function createPlatformEndpoint(params: CreatePlatformEndpointInput): Promise<CreatePlatformEndpointOutput> {
  try {
    const { token } = params;

    const { EndpointArn } = await sns.createPlatformEndpoint({
      PlatformApplicationArn: process.env["platform-application-arn"] as string,
      Token: token,
    }).promise();

    if (!EndpointArn) {
      throw new Error("EndpointArn not returned from sns.createPlatformEndpoint");
    }

    return { endpointArn: EndpointArn };
  } catch (error) {
    console.log("Error in createPlatformEndpoint:\n", error);

    throw error;
  }
}

export class PushNotificationListener {
  private persistentIds: string[];

  public notifications: NotificationContent[];

  constructor() {
    this.persistentIds = [];
    this.notifications = [];
  }

  public async init(userId: string, eventType: PushNotificationEvent): Promise<void> {
    const senderId = process.env["gcm-sender-id"] as string;
    const creds = await register(senderId);

    const { endpointArn } = await createPlatformEndpoint({ token: creds.fcm.token });

    await createListenerMapping({ userId, type: ListenerType.PushNotification, value: creds.gcm.appId, valueTwo: endpointArn });

    await listen({ ...creds, persistentIds: this.persistentIds }, (event) => {
      this.persistentIds.push(event.persistentId);

      if (event.notification.data.event === eventType) {
        this.notifications.push(event.notification);
      }
    });
  }

  public clearNotifications(): void {
    this.notifications = [];
  }
}

export class WebSocketListener {
  public messages: { event: WebSocketEvent, data: Record<string, unknown>; }[];

  constructor() {
    this.messages = [];
  }

  public async init(userId: string, eventType: WebSocketEvent): Promise<void> {
    const { accessToken } = await getAccessToken(userId);

    const webSocket = new WebSocket(`${process.env.webSocketUrl as string}?token=${accessToken}`);

    await new Promise((resolve, reject) => {
      webSocket.on("error", (error) => reject(error));
      webSocket.on("open", (event: unknown) => resolve(event));
      webSocket.on("message", (event) => {
        const message = JSON.parse(event as string);

        if (message.event === eventType) {
          this.messages.push(message);
        }
      });
    });
  }

  public clearMessages(): void {
    this.messages = [];
  }
}

export async function createWebSocketListener(params: CreateWebSocketListenerInput): Promise<CreateWebSocketListenerOutput> {
  try {
    const { userId, eventType } = params;

    const webSocketListener = new WebSocketListener();

    await webSocketListener.init(userId, eventType);

    return webSocketListener;
  } catch (error) {
    console.log("Error in createWebSocketListener:\n", error);

    throw error;
  }
}

export async function createPushNotificationListener(params: CreatePushNotificationListenerInput): Promise<CreatePushNotificationListenerOutput> {
  try {
    const { userId, eventType } = params;

    const pushNotificationListener = new PushNotificationListener();

    await pushNotificationListener.init(userId, eventType);

    return pushNotificationListener;
  } catch (error) {
    console.log("Error in createPushNotificationListener:\n", error);

    throw error;
  }
}

export interface CreateListenerMappingInput {
  userId: string;
  type: ListenerType;
  value: string;
  valueTwo?: string;
}

export interface CreateListenerMappingOutput {
  listenerMapping: RawListenerMapping;
}

export interface CreatePushNotificationListenerInput {
  userId: string;
  eventType: PushNotificationEvent;
}

export type CreatePushNotificationListenerOutput = PushNotificationListener;

export interface CreateWebSocketListenerInput {
  userId: string;
  eventType: WebSocketEvent;
}

export type CreateWebSocketListenerOutput = WebSocketListener;

export interface GetListenerMappingsByUserIdAndTypeInput {
  userId: string;
  type: ListenerType;
}

export interface GetListenerMappingsByUserIdAndTypeOutput {
  listenerMappings: RawListenerMapping[];
}

export interface CreatePlatformEndpointInput {
  token: string;
}

export interface CreatePlatformEndpointOutput {
  endpointArn: string;
}
