import { Record, String } from "runtypes";

export const CreateConversationDto = Record({
  pathParameters: Record({ userId: String }),
  body: Record({ name: String }),
});
