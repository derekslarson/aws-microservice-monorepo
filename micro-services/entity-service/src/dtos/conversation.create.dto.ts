import { Record, String } from "runtypes";

export const CreateConversationRequestDto = Record({
  pathParameters: Record({ userId: String }),
  body: Record({ name: String }),
});
