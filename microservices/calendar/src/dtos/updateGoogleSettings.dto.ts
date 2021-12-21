import { Optional, Record, String } from "runtypes";
import { UserIdRuntype } from "@yac/util/src/runtypes/userId.runtype";

export const UpdateGoogleSettingsDto = Record({
  pathParameters: Record({ userId: UserIdRuntype }),
  body: Record({ defaultCalendarId: Optional(String), defaultAccountId: Optional(String) }),
});
