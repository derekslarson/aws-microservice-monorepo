import { Record, String } from "runtypes";

export const AddUserAsFriendDto = Record({
  pathParameters: Record({ userId: String }),
  body: Record({ friendId: String }),
});
