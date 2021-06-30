import DynamoDB from "aws-sdk/clients/dynamodb";

export type RawEntity<T = DynamoDB.DocumentClient.AttributeMap> = T & { type: string; pk: string; sk: string; gsi1pk?: string, gsi1sk?: string; gsi2pk?: string, gsi2sk?: string; };
