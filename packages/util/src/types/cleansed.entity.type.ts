import DynamoDB from "aws-sdk/clients/dynamodb";
import { RawEntity } from "./raw.entity.type";

export type CleansedEntity<T = DynamoDB.DocumentClient.AttributeMap> = Exclude<T, RawEntity<T>>;
