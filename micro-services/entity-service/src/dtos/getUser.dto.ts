import { Record, String } from "runtypes";

export const GetUserDto = Record({ pathParameters: Record({ userId: String }) });
