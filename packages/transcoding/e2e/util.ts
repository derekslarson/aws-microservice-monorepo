import { documentClient } from "../../../e2e/util";

export async function getHttpEventsByPath(params: GetHttpEventsByPathInput): Promise<GetHttpEventsByPathOutput> {
  try {
    const { path } = params;

    const { Items } = await documentClient.query({
      TableName: process.env["transcoding-testing-table-name"] as string,
      KeyConditionExpression: "#pk = :pk",
      ExpressionAttributeNames: { "#pk": "pk" },
      ExpressionAttributeValues: { ":pk": `path-${path}` },
    }).promise();

    const httpEvents = Items as HttpEvent[];

    return { httpEvents };
  } catch (error) {
    console.log("Error in getHttpEventsByPath:\n", error);

    throw error;
  }
}

export async function deleteHttpEventsByPath(params: DeleteHttpEventsByPathInput): Promise<DeleteHttpEventsByPathOutput> {
  try {
    const { path } = params;

    const { httpEvents } = await getHttpEventsByPath({ path });

    await Promise.all(httpEvents.map((snsEvent) => documentClient.delete({
      TableName: process.env["transcoding-testing-table-name"] as string,
      Key: {
        pk: snsEvent.pk,
        sk: snsEvent.sk,
      },
    }).promise()));
  } catch (error) {
    console.log("Error in deleteHttpEventsByPath:\n", error);

    throw error;
  }
}

export async function getSnsEventsByTopicArn<T extends Record<string, unknown> = Record<string, unknown>>(params: GetSnsEventsByTopicArnInput): Promise<GetSnsEventsByTopicArnOutput<T>> {
  try {
    const { topicArn } = params;

    const { Items } = await documentClient.query({
      TableName: process.env["transcoding-testing-table-name"] as string,
      KeyConditionExpression: "#pk = :pk",
      ExpressionAttributeNames: { "#pk": "pk" },
      ExpressionAttributeValues: { ":pk": `topic-${topicArn}` },
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
      TableName: process.env["transcoding-testing-table-name"] as string,
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

export interface GetHttpEventsByPathInput {
  path: string;
}

type HttpEvent = {
  // `path-${path}`
  pk: string;
  // uuid
  sk: string;
  method: string;
  path: string;
  body?: Record<string, unknown> | string;
  queryStringParameters?: Record<string, unknown>;
  headers?: Record<string, unknown>
};
export interface GetHttpEventsByPathOutput {
  httpEvents: HttpEvent[];
}

export interface DeleteHttpEventsByPathInput {
  path: string;
}

export type DeleteHttpEventsByPathOutput = void;
