import { Record, String } from "runtypes";
import { UserId } from "../runtypes/userId.runtype";

export const CreateOrganizationDto = Record({
  pathParameters: Record({ userId: UserId }),
  body: Record({ name: String }),
});
