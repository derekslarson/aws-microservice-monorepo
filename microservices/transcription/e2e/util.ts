/* eslint-disable no-console */
import { AWSError } from "aws-sdk";
import { readFileSync } from "fs";
import { s3, documentClient } from "../../../e2e/util";

export async function getSnsEventsByTopicArn<T extends Record<string, unknown> = Record<string, unknown>>(params: GetSnsEventsByTopicArnInput): Promise<GetSnsEventsByTopicArnOutput<T>> {
  try {
    const { topicArn } = params;

    const { Items } = await documentClient.query({
      TableName: process.env["transcription-testing-table-name"] as string,
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
      TableName: process.env["transcription-testing-table-name"] as string,
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

export async function fileExists(params: FileExistsInput): Promise<FileExistsOutput> {
  try {
    const { bucketName, key } = params;

    await s3.headObject({
      Bucket: bucketName,
      Key: key,
    }).promise();

    // if we get here, the file exists, so return true
    return { fileExists: true };
  } catch (error) {
    if ((error as AWSError)?.code === "NotFound") {
      // if we get here, the file doesn't exist, so return false

      return { fileExists: false };
    }

    // if we get here, there was an unexpected error, so log and throw
    console.log("Error in fileExists:\n", error);

    throw error;
  }
}

export async function uploadTestMessageFileIfNecessary(params: UploadTestMessageFileIfNecessaryInput): Promise<UploadTestMessageFileIfNecessaryOutput> {
  try {
    const { conversationId, messageId } = params;

    const bucketName = process.env["enhanced-message-s3-bucket-name"] as string;
    const key = `${conversationId}/${messageId}.mp3`;

    const { fileExists: messageFileExists } = await fileExists({ bucketName, key });

    if (messageFileExists) {
      return;
    }

    const file = readFileSync(`${process.cwd()}/e2e/test-enhanced-message.mp3`);

    await s3.upload({
      Bucket: bucketName,
      Key: key,
      Body: file,
    }).promise();
  } catch (error) {
    console.log("Error in uploadTestMessageFileIfNecessary:\n", error);

    throw error;
  }
}

export async function uploadTestTranscriptionFileIfNecessary(params: UploadTestTranscriptionFileIfNecessaryInput): Promise<UploadTestTranscriptionFileIfNecessaryOutput> {
  try {
    const { messageId } = params;

    const environment = process.env.environment as string;
    const bucketName = process.env["transcription-s3-bucket-name"] as string;
    const key = `${environment}_${messageId}.json`;

    const { fileExists: transcriptionFileExists } = await fileExists({ bucketName, key });

    if (transcriptionFileExists) {
      return;
    }

    const file = readFileSync(`${process.cwd()}/e2e/test-transcription.mp3`);

    await s3.upload({
      Bucket: bucketName,
      Key: key,
      Body: file,
    }).promise();
  } catch (error) {
    console.log("Error in uploadTestTranscriptionFileIfNecessary:\n", error);

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

export interface FileExistsInput {
  bucketName: string;
  key: string;
}

export interface FileExistsOutput {
  fileExists: boolean;
}

export interface UploadTestMessageFileIfNecessaryInput {
  conversationId: string;
  messageId: string;
}

export type UploadTestMessageFileIfNecessaryOutput = void;

export interface UploadTestTranscriptionFileIfNecessaryInput {
  messageId: string;
}

export type UploadTestTranscriptionFileIfNecessaryOutput = void;
