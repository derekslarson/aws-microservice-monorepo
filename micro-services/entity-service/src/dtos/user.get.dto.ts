import { Record, String } from "runtypes";

export const GetUserRequestDto = Record({ pathParameters: Record({ userId: String }) });
