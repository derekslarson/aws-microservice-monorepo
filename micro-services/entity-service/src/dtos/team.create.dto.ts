import { Record, String } from "runtypes";

export const CreateTeamRequestDto = Record({
  pathParameters: Record({ userId: String }),
  body: Record({ name: String }),
});
