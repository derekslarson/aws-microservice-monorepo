import { Record, String, Optional } from "runtypes";
import { Limit, UserIdRuntype } from "@yac/util";

export const GetGoogleEventsDto = Record({ pathParameters: Record({ userId: UserIdRuntype }), queryStringParameters: Record({ exclusiveStartKey: Optional(String), limit: Optional(Limit) }) });
