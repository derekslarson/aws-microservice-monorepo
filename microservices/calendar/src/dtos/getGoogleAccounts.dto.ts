import { Record } from "runtypes";
import { UserIdRuntype } from "@yac/util";

export const GetGoogleAccountsDto = Record({ pathParameters: Record({ userId: UserIdRuntype }) });
