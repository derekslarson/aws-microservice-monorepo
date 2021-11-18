import { Record, String, Optional } from "runtypes";
import { Limit } from "@yac/util";

export const GetGoogleEventsDto = Record({ pathParameters: Record({ userId: String }), queryStringParameters: Record({ exclusiveStartKey: Optional(String), limit: Optional(Limit) }) });
