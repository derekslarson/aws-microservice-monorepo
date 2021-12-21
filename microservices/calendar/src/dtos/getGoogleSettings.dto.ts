import { Record } from "runtypes";
import { UserIdRuntype } from "@yac/util";

export const GetGoogleSettingsDto = Record({ pathParameters: Record({ userId: UserIdRuntype }) });
