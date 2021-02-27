import { DynamoDB } from "aws-sdk";

export type DocumentClientFactory = () => DynamoDB.DocumentClient;

export const documentClientFactory: DocumentClientFactory = (): DynamoDB.DocumentClient => new DynamoDB.DocumentClient();
