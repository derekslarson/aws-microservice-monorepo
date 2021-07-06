import { Record, String } from "runtypes";

export const RemoveUserAsFriendDto = Record({ pathParameters: Record({ userId: String, friendId: String }) });
