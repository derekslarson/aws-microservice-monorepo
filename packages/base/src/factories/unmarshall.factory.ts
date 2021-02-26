import { DynamoDB } from "aws-sdk";

export type Unmarshall = typeof DynamoDB.Converter.unmarshall;

export type UnmarshallFactory = () => Unmarshall;

export const unmarshallFactory: UnmarshallFactory = (): Unmarshall =>
  DynamoDB.Converter.unmarshall;
