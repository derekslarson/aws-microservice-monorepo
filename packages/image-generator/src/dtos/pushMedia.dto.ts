import { Record, String, Union, Literal } from "runtypes";

export const PushMediaDto = Record({
  pathParameters: Record({ messageId: String, folder: Union(Literal("user"), Literal("group")) }),
  queryStringParameters: Record({ token: String }),
});
