import { Record } from "runtypes";
import { UserIdRuntype } from "@yac/util/src/runtypes/userId.runtype";

export const GetGoogleAccountsDto = Record({ pathParameters: Record({ userId: UserIdRuntype }) });
