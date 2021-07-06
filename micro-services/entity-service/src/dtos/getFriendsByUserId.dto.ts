import { Record, String } from "runtypes";

export const GetFriendsByuserIdDto = Record({ pathParameters: Record({ userId: String }) });
