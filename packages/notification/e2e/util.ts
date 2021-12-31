/* eslint-disable no-console */
/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import WebSocket from "ws";
import { register, listen, NotificationContent } from "push-receiver";
import ksuid from "ksuid";
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

export async function registerMockDevice(params: RegisterMockDeviceInput): Promise<RegisterMockDeviceOutput> {
  try {
    const { userId } = params;

    const deviceId = ksuid.randomSync().string;
    const token = ksuid.randomSync().string;

    const { endpointArn } = await createPlatformEndpoint({ token });

    await createListenerMapping({ userId, type: ListenerType.PushNotification, value: deviceId, valueTwo: endpointArn });

    return { deviceId, endpointArn };
  } catch (error) {
    console.log("Error in registerMockDevice:\n", error);

    throw error;
  }
}

// This doesn't consistently work. There is most likely a bug in the library (push-receiver).
// It can be used to test the push flow end-to-end though (using a valid FCM token)
// In the future, if we can find the issue in the library, or it is fixed by someone else, we can use it
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

      if (event.notification.data?.event === eventType) {
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

export async function getSnsEventsByTopicArn<T extends Record<string, unknown> = Record<string, unknown>>(params: GetSnsEventsByTopicArnInput): Promise<GetSnsEventsByTopicArnOutput<T>> {
  try {
    const { topicArn } = params;

    const { Items } = await documentClient.query({
      TableName: process.env["notification-testing-sns-event-table-name"] as string,
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
      TableName: process.env["notification-testing-sns-event-table-name"] as string,
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

export interface RegisterMockDeviceInput {
  userId: string;
}

export interface RegisterMockDeviceOutput {
  deviceId: string;
  endpointArn: string;
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
