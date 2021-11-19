import { Record } from "runtypes";
import { UserIdRuntype } from "@yac/util";

export const GetGoogleEventsDto = Record({ pathParameters: Record({ userId: UserIdRuntype }) });
