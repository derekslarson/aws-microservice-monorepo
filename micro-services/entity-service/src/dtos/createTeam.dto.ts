import { Record, String } from "runtypes";

export const CreateTeamDto = Record({
  pathParameters: Record({ userId: String }),
  body: Record({ name: String }),
  dog: String,
});
